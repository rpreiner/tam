///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////



///  INTERACTIVE PARAMETERS with initial values

// Force-Layout parameters
var PARAM_ALPHA = 0.5;
var PARAM_GRAVITY_X = 0.06;
var PARAM_GRAVITY_Y = 0.06;
var PARAM_SF_STRENGTH = 0;
var PARAM_REPULSION_STRENGTH = 400;
var PARAM_LINK_STRENGTH = 0.2;
var PARAM_FRICTION = 0.4;

// Graph appearance
var PARAM_NODE_RADIUS = 10;
var PARAM_FONT_SIZE = 20;
var PARAM_LINK_DISTANCE = 1.5 * PARAM_NODE_RADIUS;
var PARAM_LINK_WIDTH = 2;
var PARAM_LINK_OPACITY = 1;
var PARAM_ARROW_RADIUS = 14;
var PARAM_LABEL_COLOR = "black";
var PARAM_LINK_COLOR = "black";
var PARAM_PERSON_LABEL_OPACITY = 0.7;

const InterpolationType = {'MIN': 1, 'AVG': 2, 'MAX': 3};
var PARAM_SF_INTERPOLATION_TYPE = InterpolationType.MIN;
	

// Scalarfield Appearance
var PARAM_RENDER_UPDATE_INTERVAL = 0;		// number of simulation updates before updating the tick visualization
var PARAM_SHADING = true;
var PARAM_COLORMAP = d3.interpolateGnBu;
var PARAM_REVERSE_COLORMAP = true;
var PARAM_USE_MOUSEOVER = false;
var PARAM_SHOW_GRAPH = true;
var PARAM_SHOW_CONTOURS = true;
var PARAM_SHOW_LINKS = true;
var PARAM_SHOW_NAMES = true;
var PARAM_PERSON_LABELS_BELOW_NODE = true;
var PARAM_SHOW_TUNNELS = true;
var PARAM_ENERGIZE = true;
var PARAM_EMBED_LINKS = true;
var PARAM_LINK_SAMPLE_STEPSIZE = 2;
var PARAM_UNDERGROUND_THRESHOLD	= 10;	
var PARAM_SCALARFIELD_RESOLUTION = 400;
var PARAM_SCALARFIELD_DILATION_ITERS = 2;
var PARAM_ARROW_DISTANCE_FACTOR = 1.0;
var PARAM_INTERPOLATE_NN = false;
var PARAM_INDICATOR_EPSILON = 0.1;

	
// Contour Map Appearance 
var PARAM_CONTOUR_WIDTH = 0.5;    // pixel width of small contours
var PARAM_RANGE_MIN = 0;          // minimum value
var PARAM_RANGE_MAX = 10;         // maximum value
var PARAM_HEIGHT_SCALE = 50;
var PARAM_CONTOUR_STEP = 10;        // value range between contours
var PARAM_CONTOUR_BIG_STEP = 100;   // value range between thick contours
var PARAM_INDICATOR_FONTSIZE = 15;
var PARAM_MANY_SEEDS = false;
	


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///  GLOBAL VARIABLES

var CANVAS;
var GRAPH;
var PNODES;
var LINKNODES;
var SCALARFIELD;
var TIMEFIELD;

var SVG_PERSON_CIRCLES;
var SVG_NODE_CIRCLES;
var SVG_LINKS;
var SVG_PERSON_LABELS;
var SVG_LABELS;
var SVG_LINKS_STREETS;
var SVG_LINKS_TUNNELS;
var SVG_TUNNEL_ENTRIES_1;
var SVG_TUNNEL_ENTRIES_2;

var SVG_CONTOURS;
var SVG_MAP;
var SVG_SHADING_CONTOURS;
var SVG_COLORMAP;
var SVG_INDICATOR_LABELS;


var FORCE_SIMULATION;
var REPULSION_FORCE;
var LINK_FORCE;

// selection of SVG Circles that should be dragable
var SVG_DRAGABLE_ELEMENTS;
		

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function createForceGraph(json)
{
    //  DATA INITIALIZATION
	LINKNODES = [];
	RANGENODES = [];
	RANGE_LINES = [];  
    NODES = [];
	LINKS = [];
	
	
	PARAM_RANGE_MIN = 1e8;
	PARAM_RANGE_MAX = -1e8;


    // list nodes
	//--------------------------------------------------------------------

	var nodeMap = new Map();
	Object.values(json.nodes).forEach(node => 
	{
		node.r = PARAM_NODE_RADIUS;

		if (node.value == 0)
			node.value = 0.001
		
		// automatically adjust TAM height range to min and max values
		if (node.value != 0)
		{
			PARAM_RANGE_MIN = Math.min(PARAM_RANGE_MIN, node.value);
			PARAM_RANGE_MAX = Math.max(PARAM_RANGE_MAX, node.value);
		}
				
		nodeMap.set(node.id, node);
		NODES.push(node);
	});


	// Range-Hack: avoid too dark shades of blue
	range = PARAM_RANGE_MAX - PARAM_RANGE_MIN;
	PARAM_RANGE_MIN = Math.floor(PARAM_RANGE_MIN - range / 5);
	PARAM_RANGE_MAX = Math.ceil(PARAM_RANGE_MAX + range / 5);


	// list dependencies
	//--------------------------------------------------------------------
	Object.values(json.links).forEach(link => {
		var source = nodeMap.get(link.source);
		var target = nodeMap.get(link.target);

		if (source == undefined)
			console.log("Source " + link.source + " is undefined!");
		if (target == undefined)
			console.log("Target " + link.target + " is undefined!");
		
		if (source && target)
		{
			var link = {"source": source, "target": target, "directed": link.directed, "distance": PARAM_LINK_DISTANCE };
			LINKS.push(link)
		}
	});
	
    console.log("Created Graph with " + NODES.length + " nodes and " + LINKS.length + " links.")


    
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// FORCE SIMULATION OF FORCE-DIRECTED GRAPH

	REPULSION_FORCE = d3.forceManyBody().strength(-PARAM_REPULSION_STRENGTH);
	LINK_FORCE = d3.forceLink(LINKS).distance(function(d){ return d.distance; }).strength(PARAM_LINK_STRENGTH);
		
	PNODES = NODES;

	FORCE_SIMULATION = d3.forceSimulation(NODES)
		.force("charge", REPULSION_FORCE)
		.force("x", d3.forceX(0).strength(PARAM_GRAVITY_X)) 
		.force("y", d3.forceY(0).strength(PARAM_GRAVITY_Y)) 
		.force("link", LINK_FORCE)
		.force("similarity", function(alpha){ similarityForce(PNODES, alpha) })
		.force("collision", d3.forceCollide().radius(function(d){ return 3 * d.r; }))
		.velocityDecay(PARAM_FRICTION)		// friction since d3.v4
		.alpha(PARAM_ALPHA)
		.alphaDecay(0)
		.on("tick", tick)
		.on("end", updateScalarField)

    console.log("Force Graph Initialized.")

	
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	///  CREATE SVG ELEMENTS

	initSVGLayers();
	setColorMap();
	    
	SVG_LINKS = GRAPH_LAYER.selectAll(".link")
		.data(LINKS).enter()
		.append("line")
		.attr("stroke", PARAM_LINK_COLOR)
		.attr("stroke-width", PARAM_LINK_WIDTH + "px")
		.attr("stroke-opacity", PARAM_LINK_OPACITY)
		.attr("marker-end",	function(link) { return link.directed ? "url(#arrow)" : "none"; });
		
	SVG_NODE_CIRCLES = GRAPH_LAYER.selectAll(".nodes")
		.data(NODES).enter()
		.append("circle")
		.style("fill", function(node) { return typeof(node.value) == "number" ? SVG_COLORMAP(node.value) : "red"; })
		.style("stroke", "#222")
		.attr("stroke-width", (PARAM_NODE_RADIUS / 4) + "px")
		.attr("r", function(node) { return node.r; })
		//.attr("filter", "url(#dropshadow)")
		
			
	if (PARAM_SHOW_NAMES)
		showNames();

    console.log("SVG Elements Initialized.")

    SVG_DRAGABLE_ELEMENTS = SVG_NODE_CIRCLES;

    initInteractions();
	console.log("Interactions Initialized.")
}


function initSVGLayers()
{
    CANVAS = d3.select("#tam").append("g");
	TOPO_LAYER = CANVAS.append("g").attr("id", "topolayer");
	SHADING_LAYER = CANVAS.append("g").attr("id", "shadinglayer");
	GRAPH_LAYER = CANVAS.append("g").attr("id", "graphlayer");
}



function similarityForce(nodes, alpha) 
{ 
	var target_slope = 20;	// a value difference of 1 should map to a unit distance of 10

	const VIRTUAL_LINK_STRENGTH = PARAM_SF_STRENGTH / Math.max(nodes.length,1);

	for (var i = 0, n = nodes.length; i < n; i++) 
	{
		var p = nodes[i];
		if (p.value == null)
			continue;
		
		for (var j = i + 1; j < n; j++)
		{
			var q = nodes[j];
			if (q.value == null)
				continue;
			
			var v = new vec(q.x + q.vx - p.x - p.vx, q.y + q.vy - p.y - p.vy);	
			var len = v.norm();
			
			var dv = Math.abs(q.value - p.value);
			var target_len = dv * target_slope;
			
			var targetvec = v.mul( (len - target_len) / len );

			var F = targetvec.mul(VIRTUAL_LINK_STRENGTH * alpha);

			p.vx += F.x;
			p.vy += F.y;
			q.vx -= F.x;
			q.vy -= F.y;
		}
	}
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var tickCounter = 0;

function tick()
{
	// only update visualization each N iterations for performance
	if ((tickCounter++) % PARAM_RENDER_UPDATE_INTERVAL)
		return;

	// move node circles to defined position (d.x,d.y)
	SVG_NODE_CIRCLES.attr("cx", function(d) { return d.x; }).attr("cy", function(d) { return d.y; })
	
	// set links
	SVG_LINKS
		.attr("x1", function(d) { 
			//return d.source.x; 
			var l = distance(d.source, d.target), t = (l - d.source.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;
            var x = d.source.x * t + d.target.x * (1-t);
            return isNaN(x) ? d.source.x : x;
		})
		.attr("y1", function(d) { 
			//return d.source.y; 
			var l = distance(d.source, d.target), t = (l - d.source.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;
            var y = d.source.y * t + d.target.y * (1-t);
            return isNaN(y) ? d.source.y : y;
		})
		.attr("x2", function(d) { 
            //return d.target.x;
            var l = distance(d.source, d.target), t = (l - d.target.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;
            var x = d.source.x * (1-t) + d.target.x * t;
            return isNaN(x) ? d.target.x : x;
        })
        .attr("y2", function(d) { 
            //return d.target.y;
            var l = distance(d.source, d.target), t = (l - d.target.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;  
            var y = d.source.y * (1-t) + d.target.y * t;
            return isNaN(y) ? d.target.y : y;
		})
		

	// set labels
	if (PARAM_SHOW_NAMES)
		SVG_LABELS.attr("transform", placeLabel)
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function showNames()
{
	SVG_LABELS = GRAPH_LAYER.selectAll(".labels")
		.data(NODES).enter()
		.append("text")
		.text(function(node) { return node.name; })
		.style("fill", PARAM_LABEL_COLOR)
		.style("stroke", "white")
		.style("stroke-width", PARAM_FONT_SIZE / 5)
		.style("paint-order", "stroke")
		.style("font-family", "Calibri")
		.style("font-size", PARAM_FONT_SIZE)
		.style("pointer-events", "none")  // to prevent mouseover/drag capture
		.style("opacity", PARAM_PERSON_LABEL_OPACITY)
		
	// compute label lengths and store them
	SVG_LABELS.each(function(node) { node.labelwidth = this.getComputedTextLength(); })

	// now adjust label position based on label lengths
	SVG_LABELS.attr("transform", placeLabel)
}


function placeLabel(node)
{
	if (PARAM_PERSON_LABELS_BELOW_NODE)
	{
		// below the node
		var x = node.x - node.labelwidth * 0.5;
		var y = node.y + node.r + 1.0 * PARAM_FONT_SIZE;
		return "translate(" + x + ", " + y + ")";
	}
	else
	{
		// right beside the node
		var x = node.x + 1.5 * node.r;
		var y = node.y + PARAM_FONT_SIZE/4;
		return "translate(" + x + ", " + y + ")";
	}
}


function setContourColor(path) 
{
    return darken(SVG_COLORMAP(path.value));
}

function setContourWidth(path) 
{
    return path.value % PARAM_CONTOUR_BIG_STEP ?  1 * PARAM_CONTOUR_WIDTH  :  4 * PARAM_CONTOUR_WIDTH;
}


function resetScalarField()
{
	// remove old paths		
	if (SVG_MAP) SVG_MAP.remove();
	if (SVG_CONTOURS) SVG_CONTOURS.remove();
	if (SVG_SHADING_CONTOURS) SVG_SHADING_CONTOURS.remove();
	if (SVG_LINKS_STREETS) SVG_LINKS_STREETS.remove();
	if (SVG_LINKS_TUNNELS) SVG_LINKS_TUNNELS.remove();
	if (SVG_TUNNEL_ENTRIES_1) SVG_TUNNEL_ENTRIES_1.remove();
	if (SVG_TUNNEL_ENTRIES_2) SVG_TUNNEL_ENTRIES_2.remove();
	if (SVG_INDICATOR_LABELS) SVG_INDICATOR_LABELS.remove();

	// make the original simple links visible again
	if (SVG_LINKS) SVG_LINKS.attr("opacity", 1);  
}


function resetColormap()
{
	TOPO_LAYER.selectAll(".contours")
		.attr("fill", function(d) { return brighten(SVG_COLORMAP(d.value),0.05); })
		.attr("stroke", setContourColor)
		.attr("stroke-width", setContourWidth);
}


function setColorMap() 
{
    var thresholds = d3.range(PARAM_RANGE_MIN, PARAM_RANGE_MAX, PARAM_CONTOUR_STEP); 
	if (PARAM_REVERSE_COLORMAP)
		SVG_COLORMAP = d3.scaleDiverging(PARAM_COLORMAP).domain([PARAM_RANGE_MAX, (PARAM_RANGE_MAX + PARAM_RANGE_MIN) * 0.5, PARAM_RANGE_MIN]);
	else	
		SVG_COLORMAP = d3.scaleDiverging(PARAM_COLORMAP).domain([PARAM_RANGE_MIN, (PARAM_RANGE_MAX + PARAM_RANGE_MIN) * 0.5, PARAM_RANGE_MAX]);

	if (SVG_NODE_CIRCLES)
		SVG_NODE_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? SVG_COLORMAP(node.value) : "red"; })
}


function updateRange()
{
	// in case color ramp range changes
	SVG_PERSON_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? SVG_COLORMAP(node.value) : "red"; })
}


function updateScalarField()
{
	// remove old paths		
	resetScalarField();
	
	// update scalarfield and extract paths
	//------------------------------------------------------------
	var topopoints = [];

	// add constraints at person positions
	NODES.forEach(p =>	{
		if (isNumber(p.value)) topopoints.push(p);
	})
		
	// Create Topopoints for links
	if (PARAM_EMBED_LINKS)
	{
		LINKS.forEach(link => {
			if (link.source.value && link.target.value) {
				var pv0 = new vec(link.source.x, link.source.y, link.source.value);
				var pv1 = new vec(link.target.x, link.target.y, link.target.value);
				var v = pv1.sub(pv0);
				var nsteps = v.norm() / PARAM_LINK_SAMPLE_STEPSIZE;
				if (nsteps > 0) {
					v = v.div(nsteps);
					for (var i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
						topopoints.push({ 'x' : pv.x, 'y': pv.y, 'value' : pv.z });
				}
			}
		});
	}
				

	// Create Scalar Field
	//-----------------------------------------------------------

	console.log(topopoints.length, " TopoPoints")
	SCALARFIELD = new TopoMap(topopoints, PARAM_SF_INTERPOLATION_TYPE, PARAM_SCALARFIELD_RESOLUTION, PARAM_SCALARFIELD_DILATION_ITERS);

	var thresholds = d3.range(PARAM_RANGE_MIN, PARAM_RANGE_MAX, PARAM_CONTOUR_STEP); 

	console.log("Extracting Contours");
	var paths = SCALARFIELD.getContourPaths(thresholds);
	var scalarFieldTransformProjection = d3.geoPath().projection( 
		d3.geoTransform({
			point: function(x, y) {
				this.stream.point(x * SCALARFIELD.cellSize + SCALARFIELD.origin.x, y * SCALARFIELD.cellSize + SCALARFIELD.origin.y);
			}
		}) 
	);

	
	// create tunnels
	var INTERVALS = {'streets': [], 'tunnels': [] };
	
	if (PARAM_SHOW_TUNNELS)
	{
		console.log("Creating Tunnels");
		SVG_LINKS.attr("opacity", 0);  // make the other links invisible

		//--- 1. List all Tunnel and Street intervals -------------------
		LINKS.forEach(link => 
		{
			if (link.source.value && link.target.value) 
			{
				//--- determine 2D start and endpoint on map, respecting some offsets
				var pv0 = new vec(link.source.x, link.source.y, link.source.value);
				var pv1 = new vec(link.target.x, link.target.y, link.target.value);

				var v = pv1.sub(pv0);
				if (v.x == 0 && v.y == 0)
				{
					v.x = jiggle();
					v.y = jiggle();
				}
				var d = Math.sqrt(v.x*v.x + v.y*v.y);
				var offset = Math.min( d / 2, link.target.r + PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS);
				v = v.mul(offset/d);
				//pv0 = pv0.add(v);	// only offset target where arrow is (directional)
				pv1 = pv1.sub(v);

				//--- now sample tunnel/street line intervals
				var v = pv1.sub(pv0);
				if (!v.zero())
				{
					var nsteps = v.norm() / PARAM_LINK_SAMPLE_STEPSIZE;
					if (nsteps == 0) return;
					v = v.div(nsteps);

					var wasUnderground = SCALARFIELD.sampleBilinear(pv0.x, pv0.y) - pv0.z > PARAM_UNDERGROUND_THRESHOLD;
					currentInterval = [pv0, pv0, false];
					if (wasUnderground) 
						INTERVALS.tunnels.push(currentInterval);
					else 
						INTERVALS.streets.push(currentInterval);
					
					for (var i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
					{
						var sfValue = SCALARFIELD.sampleBilinear(pv.x, pv.y);
						var isUnderground = sfValue - pv.z > PARAM_UNDERGROUND_THRESHOLD;
							
						if (isUnderground && !wasUnderground)
						{
							var pvOffset = pv;//.sub(v.mul(2));
							INTERVALS.streets[INTERVALS.streets.length - 1][1] = pvOffset;
							INTERVALS.tunnels.push(currentInterval = [pvOffset, pv, false]);
						}
						else if (!isUnderground && wasUnderground)
						{
							var pvOffset = pv;//.add(v.mul(2));
							INTERVALS.tunnels[INTERVALS.tunnels.length - 1][1] = pvOffset;
							INTERVALS.streets.push(currentInterval = [pvOffset, pv, false]);
						}
						else
							currentInterval[1] = pv;

						wasUnderground = isUnderground;
					}
					
					// if the link is directed, mark the last interval to be and "end"-interval
					var last = wasUnderground ? INTERVALS.tunnels[INTERVALS.tunnels.length - 1] : INTERVALS.streets[INTERVALS.streets.length - 1];
					last[2] = link.directed;
				}
			}
		})

		
		//--- 2. Create SVG Elements -------------------
		SVG_LINKS_STREETS = GRAPH_LAYER.selectAll(".link_street")
			.data(INTERVALS.streets).enter()
			.append("line")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
			.attr("marker-end", interval => { return interval[2] ? "url(#arrow)" : "none"})
			.attr("x1", interval => { return interval[0].x; })
			.attr("y1", interval => { return interval[0].y; })
			.attr("x2", interval => { return interval[1].x; })
			.attr("y2", interval => { return interval[1].y; })

		SVG_LINKS_TUNNELS = GRAPH_LAYER.selectAll(".link_tunnel")
			.data(INTERVALS.tunnels).enter()
			.append("line")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
			.attr("stroke-dasharray", "0 5 5 0")
			.attr("marker-end", interval => { return interval[2] ? "url(#arrow)" : "none"})
			.attr("x1", interval => { return interval[0].x; })
			.attr("y1", interval => { return interval[0].y; })
			.attr("x2", interval => { return interval[1].x; })
			.attr("y2", interval => { return interval[1].y; })

		SVG_TUNNEL_ENTRIES_1 = GRAPH_LAYER.selectAll(".tunnel_entries1")
			.data(INTERVALS.tunnels).enter()
			.append("polyline")
			.attr("fill", "none")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", tunnel => { return PARAM_SHOW_LINKS && !tunnel[2] ? PARAM_LINK_OPACITY : 0; })	// dont show entry at end where the marker is
			.attr("points", tunnel => { return tunnelEntryPlacement(tunnel, false); })

		SVG_TUNNEL_ENTRIES_2 = GRAPH_LAYER.selectAll(".tunnel_entries2")
			.data(INTERVALS.tunnels).enter()
			.append("polyline")
			.attr("fill", "none")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0 )
			.attr("points", tunnel => { return tunnelEntryPlacement(tunnel, true); })


		if (SVG_PERSON_CIRCLES) SVG_PERSON_CIRCLES.raise();
		if (SVG_NODE_CIRCLES) SVG_NODE_CIRCLES.raise();
		if (SVG_LABELS) SVG_LABELS.raise();
	}
	else
	{
		if (SVG_LINKS_STREETS) SVG_LINKS_STREETS.attr("opacity", 0);
		if (SVG_LINKS_TUNNELS) SVG_LINKS_TUNNELS.attr("opacity", 0);
		if (SVG_TUNNEL_ENTRIES_1) SVG_TUNNEL_ENTRIES_1.attr("opacity", 0);
		if (SVG_TUNNEL_ENTRIES_2) SVG_TUNNEL_ENTRIES_2.attr("opacity", 0);

		if (SVG_LINKS)
			 SVG_LINKS
				.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
				.attr("stroke-width", PARAM_LINK_WIDTH + "px")
	}


	// add new paths
	console.log("Adding Contours");
	SVG_CONTOURS = TOPO_LAYER.selectAll(".contours")
		.data(paths)
		.enter().append("path")
		.attr("class", "contours")
		.attr("stroke", setContourColor)
		.attr("stroke-width", setContourWidth)
		.attr("fill", function(d) { return brighten(SVG_COLORMAP(d.value), 0.08); })
		.attr("d", scalarFieldTransformProjection )
		
		
	// create heightfield indicators
	console.log("Adding Height Indicators");
	computeHeightFieldIndicators(SCALARFIELD, paths, SVG_COLORMAP);


	// add shading
	if (PARAM_SHADING) {
		console.log("Computing Normal Field");
		var normalField = new NormalField(SCALARFIELD, 100 * PARAM_HEIGHT_SCALE / (PARAM_RANGE_MAX - PARAM_RANGE_MIN) );
		console.log("Extracting Shading Contour Paths");
		var shadingPaths = normalField.getShadingContourPaths(new vec(-0.5,-0.5,1).normalize());
		console.log("Adding Shading Layer");
		SVG_SHADING_CONTOURS = SHADING_LAYER.selectAll(".shadingContours")
			.data(shadingPaths)
			.enter().append("path")
			.attr("class","shadingContours")
			.attr("d", scalarFieldTransformProjection )
			.attr("fill", "rgb(253,253,254)")
			.style("mix-blend-mode", "multiply")
			.style("pointer-events", "none"); 
	}
		

	if (SVG_PERSON_CIRCLES)
		SVG_PERSON_CIRCLES.style("fill", function(d) { return isFinite(d.value) ? brighten(SVG_COLORMAP(d.value), 0.02) : "red"; })
		
	console.log("+++ Done Updating ScalarField");
}

