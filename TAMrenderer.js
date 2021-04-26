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
var PARAM_LINK_STRENGTH = 0.8;
var PARAM_FRICTION = 0.4;

// Graph appearance
var PARAM_NODE_RADIUS = 10;
var PARAM_FONT_SIZE = 20;
var PARAM_LINK_DISTANCE = 8 * PARAM_NODE_RADIUS;
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
var PARAM_REVERSE_COLORMAP = false;
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
	

// Interactions
var PARAM_SHOW_TOOLTIPS = true;
var PARAM_TOOLTIP_DRAG_OPACITY = 0.5;


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setRange(nodes)
{
	PARAM_RANGE_MIN = 1e8;
	PARAM_RANGE_MAX = -1e8;

	nodes.forEach(node => 
	{
		// automatically adjust TAM height range to min and max values
		if (node.value != null)
		{
			PARAM_RANGE_MIN = Math.min(PARAM_RANGE_MIN, node.value);
			PARAM_RANGE_MAX = Math.max(PARAM_RANGE_MAX, node.value);
		}
	});
	
	// Range-Hack: avoid too dark shades of blue
	range = PARAM_RANGE_MAX - PARAM_RANGE_MIN;
	PARAM_RANGE_MIN = Math.floor(PARAM_RANGE_MIN - range / 5);
	PARAM_RANGE_MAX = Math.ceil(PARAM_RANGE_MAX + range / 5);
}



class TAMRenderer
{
	constructor()
	{
		// Graphic Layers
		this.CANVAS;
		this.TOPO_LAYER;
		this.SHADING_LAYER;
		this.GRAPH_LAYER;

		// SVG Elements
		this.SVG_NODE_CIRCLES;
		this.SVG_LINKS;
		this.SVG_NODE_LABELS;
		this.SVG_CONTOURS;
		this.SVG_SHADING_CONTOURS;
		this.SVG_INDICATOR_LABELS;
		this.SVG_LINKS_STREETS;
		this.SVG_LINKS_TUNNELS;
		this.SVG_TUNNEL_ENTRIES_1;
		this.SVG_TUNNEL_ENTRIES_2;

		this.SVG_DRAGABLE_ELEMENTS;
		this.SVG_COLORMAP;
		
		// Data and Variables
		this.NODES = [];
		this.LINKS = [];
		this.tickCounter = 0;
		this.FORCE_SIMULATION;
		this.REPULSION_FORCE;
		this.LINK_FORCE;
	}

	createForceGraphJSON(json)
	{
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
			nodeMap.set(node.id, node);
			
			this.NODES.push(node);
		});
		
		setRange(this.NODES);
		

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
				this.LINKS.push(link)
			}
		});
		
		console.log("Created Graph with " + this.NODES.length + " nodes and " + this.LINKS.length + " links.")


		
		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// FORCE SIMULATION OF FORCE-DIRECTED GRAPH

		this.REPULSION_FORCE = d3.forceManyBody().strength(-PARAM_REPULSION_STRENGTH);
		this.LINK_FORCE = d3.forceLink(this.LINKS).distance(function(d){ return d.distance; }).strength(PARAM_LINK_STRENGTH);
			
		this.FORCE_SIMULATION = d3.forceSimulation(this.NODES)
			.force("charge", this.REPULSION_FORCE)
			.force("x", d3.forceX(0).strength(PARAM_GRAVITY_X)) 
			.force("y", d3.forceY(0).strength(PARAM_GRAVITY_Y)) 
			.force("link", this.LINK_FORCE)
			.force("similarity", function(alpha){ renderer.similarityForce(renderer.NODES, alpha) })
			.force("collision", d3.forceCollide().radius(function(d){ return 3 * d.r; }))
			.velocityDecay(PARAM_FRICTION)		// friction since d3.v4
			.alpha(PARAM_ALPHA)
			.alphaDecay(0)
			.on("tick", function tick() { renderer.tick(); })
			.on("end", function update() { renderer.updateScalarField(); });

		console.log("Force Graph Initialized.")

		
		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		///  CREATE SVG ELEMENTS

		this.initSVGLayers();
		this.setColorMap();
			
		this.SVG_LINKS = this.GRAPH_LAYER.selectAll(".link")
			.data(this.LINKS).enter()
			.append("line")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("stroke-opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
			.attr("marker-end",	function(link) { return link.directed ? "url(#arrow)" : "none"; });
			
		this.SVG_NODE_CIRCLES = this.GRAPH_LAYER.selectAll(".nodes")
			.data(this.NODES).enter()
			.append("circle")
			.style("fill", function(node) { return typeof(node.value) == "number" ? renderer.SVG_COLORMAP(node.value) : "red"; })
			.style("stroke", "#222")
			.attr("stroke-width", (PARAM_NODE_RADIUS / 4) + "px")
			.attr("r", function(node) { return node.r; })
			//.attr("filter", "url(#dropshadow)")
						
		if (PARAM_SHOW_NAMES)
			this.showNames();

		
		console.log("SVG Elements Initialized.")

		this.SVG_DRAGABLE_ELEMENTS = this.SVG_NODE_CIRCLES;

		initInteractions();
		console.log("Interactions Initialized.")
	}


	initSVGLayers()
	{
		this.CANVAS = d3.select("#tam").append("g");
		this.TOPO_LAYER = this.CANVAS.append("g").attr("id", "topolayer");
		this.SHADING_LAYER = this.CANVAS.append("g").attr("id", "shadinglayer");
		this.GRAPH_LAYER = this.CANVAS.append("g").attr("id", "graphlayer");
	}


	similarityForce(nodes, alpha) 
	{ 
		if (PARAM_SF_STRENGTH == 0)
			return;

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
	tick()
	{
		// only update visualization each N iterations for performance
		if ((this.tickCounter++) % PARAM_RENDER_UPDATE_INTERVAL)
			return;

		// move node circles to defined position (d.x,d.y)
		this.SVG_NODE_CIRCLES.attr("cx", function(d) { return d.x; }).attr("cy", function(d) { return d.y; })
		
		// set links
		this.SVG_LINKS
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
			this.SVG_NODE_LABELS.attr("transform", this.placeLabel)
	}


	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	showNames()
	{
		this.SVG_NODE_LABELS = this.GRAPH_LAYER.selectAll(".labels")
			.data(this.NODES).enter()
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
		this.SVG_NODE_LABELS.each(function(node) { node.labelwidth = this.getComputedTextLength(); })

		// now adjust label position based on label lengths
		this.SVG_NODE_LABELS.attr("transform", this.placeLabel)
	}
	
	hideNames()
	{
		if (this.SVG_NODE_LABELS)  this.SVG_NODE_LABELS.remove();
	}

	placeLabel(node)
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


	setContourColor(path) 
	{
		return darken(this.SVG_COLORMAP(path.value));
	}

	setContourWidth(path) 
	{
		return path.value % PARAM_CONTOUR_BIG_STEP ?  1 * PARAM_CONTOUR_WIDTH  :  4 * PARAM_CONTOUR_WIDTH;
	}


	resetScalarField()
	{
		// remove old paths		
		if (this.SVG_CONTOURS) this.SVG_CONTOURS.remove();
		if (this.SVG_SHADING_CONTOURS) this.SVG_SHADING_CONTOURS.remove();
		if (this.SVG_LINKS_STREETS) this.SVG_LINKS_STREETS.remove();
		if (this.SVG_LINKS_TUNNELS) this.SVG_LINKS_TUNNELS.remove();
		if (this.SVG_TUNNEL_ENTRIES_1) this.SVG_TUNNEL_ENTRIES_1.remove();
		if (this.SVG_TUNNEL_ENTRIES_2) this.SVG_TUNNEL_ENTRIES_2.remove();
		if (this.SVG_INDICATOR_LABELS) this.SVG_INDICATOR_LABELS.remove();

		// make the original simple links visible again
		if (this.SVG_LINKS && PARAM_SHOW_LINKS) this.SVG_LINKS.attr("opacity", 1);  
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	resetColormap()
	{
		this.TOPO_LAYER.selectAll(".contours")
			.attr("fill", function(d) { return brighten(renderer.SVG_COLORMAP(d.value),0.05); })
			.attr("stroke", function(path) { return renderer.setContourColor(path) })
			.attr("stroke-width", function(path) { return renderer.setContourWidth(path) })
	}

	setColorMap() 
	{
		var thresholds = d3.range(PARAM_RANGE_MIN, PARAM_RANGE_MAX, PARAM_CONTOUR_STEP); 
		if (PARAM_REVERSE_COLORMAP)
			this.SVG_COLORMAP = d3.scaleDiverging(PARAM_COLORMAP).domain([PARAM_RANGE_MIN, (PARAM_RANGE_MAX + PARAM_RANGE_MIN) * 0.5, PARAM_RANGE_MAX]);
		else	
			this.SVG_COLORMAP = d3.scaleDiverging(PARAM_COLORMAP).domain([PARAM_RANGE_MAX, (PARAM_RANGE_MAX + PARAM_RANGE_MIN) * 0.5, PARAM_RANGE_MIN]);

		if (this.SVG_NODE_CIRCLES)
			this.SVG_NODE_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? renderer.SVG_COLORMAP(node.value) : "red"; })
	}

	updateRange()
	{
		// in case color ramp range changes
		if (this.SVG_NODE_CIRCLES) this.SVG_NODE_CIRCLES.style("fill", function(node) { return typeof(node.value) == "number" ? renderer.SVG_COLORMAP(node.value) : "red"; })
	}

	
	updateScalarField()
	{
		// remove old paths		
		this.resetScalarField();
		
		//--- 1. List height field constraints
		var topopoints = [];

		// add constraints at person positions
		this.NODES.forEach(p =>	{
			if (isNumber(p.value)) topopoints.push(p);
		})
			
		// Create Topopoints for links
		if (PARAM_EMBED_LINKS)
		{
			this.LINKS.forEach(link => {
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
					
		//--- 2. Create scalar field
		console.log(topopoints.length, " TopoPoints")
		var SCALARFIELD = new TopoMap(topopoints, PARAM_SF_INTERPOLATION_TYPE, PARAM_SCALARFIELD_RESOLUTION, PARAM_SCALARFIELD_DILATION_ITERS);
				
		
		//--- 3. Create tunnels and overlays
		if (PARAM_SHOW_TUNNELS)
		{
			console.log("Creating Tunnels");
			this.SVG_LINKS.attr("opacity", 0);  // make the other links invisible

			var SEGMENTS = [];
			this.LINKS.forEach(link =>
			{
				if (link.source.value && link.target.value)
				{
					// determine 2D start and endpoint on map, respecting some offsets
					var pv0 = new vec(link.source.x, link.source.y, link.source.value);
					var pv1 = new vec(link.target.x, link.target.y, link.target.value);

					SEGMENTS.push({ 'pv0': pv0, 'pv1': pv1, 'directed': link.directed, 'r1': link.target.r });
				}
			});
			
			// create tunnels
			this.createTunnels(SCALARFIELD, SEGMENTS);

			if (this.SVG_NODE_CIRCLES) this.SVG_NODE_CIRCLES.raise();
			if (this.SVG_NODE_LABELS) this.SVG_NODE_LABELS.raise();
		}
		else
		{
			this.SVG_LINKS_STREETS.attr("opacity", 0);
			this.SVG_LINKS_TUNNELS.attr("opacity", 0);
			this.SVG_TUNNEL_ENTRIES_1.attr("opacity", 0);
			this.SVG_TUNNEL_ENTRIES_2.attr("opacity", 0);
			this.SVG_LINKS.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
						  .attr("stroke-width", PARAM_LINK_WIDTH + "px")
		}

		this.addHeightfieldOverlays(SCALARFIELD);
			
		console.log("+++ Done Updating ScalarField");
	}
	
	
	createTunnels(SCALARFIELD, SEGMENTS)
	{
		var INTERVALS = {'streets': [], 'tunnels': [] };
		
		//--- 1. List all Tunnel and Street intervals -------------------
		SEGMENTS.forEach(segment => 
		{
			//--- determine 2D start and endpoint on map, respecting some offsets
			var pv0 = segment.pv0;
			var pv1 = segment.pv1;
			var v = pv1.sub(pv0);
			if (v.x == 0 && v.y == 0) {
				v.x = jiggle();
				v.y = jiggle();
			}
			var d = Math.sqrt(v.x*v.x + v.y*v.y);
			var offset = Math.min( d / 2, segment.r1 + PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS);
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
				var currentInterval = [pv0, pv0, false];
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
				last[2] = segment.directed;
			}
		
		})
			
		//--- 2. Create SVG Elements ---------------------------------------------------------
		this.SVG_LINKS_STREETS = this.GRAPH_LAYER.selectAll(".link_street")
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

		this.SVG_LINKS_TUNNELS = this.GRAPH_LAYER.selectAll(".link_tunnel")
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

		this.SVG_TUNNEL_ENTRIES_1 = this.GRAPH_LAYER.selectAll(".tunnel_entries1")
			.data(INTERVALS.tunnels).enter()
			.append("polyline")
			.attr("fill", "none")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", tunnel => { return PARAM_SHOW_LINKS && !tunnel[2] ? PARAM_LINK_OPACITY : 0; })	// dont show entry at end where the marker is
			.attr("points", tunnel => { return this.placeTunnelEntry(tunnel, false); })

		this.SVG_TUNNEL_ENTRIES_2 = this.GRAPH_LAYER.selectAll(".tunnel_entries2")
			.data(INTERVALS.tunnels).enter()
			.append("polyline")
			.attr("fill", "none")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0 )
			.attr("points", tunnel => { return renderer.placeTunnelEntry(tunnel, true); })
	}
	
	
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
	
	addHeightfieldOverlays(SCALARFIELD)
	{
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
			
		// add new paths
		console.log("Adding Contours");
		this.SVG_CONTOURS = this.TOPO_LAYER.selectAll(".contours")
			.data(paths)
			.enter().append("path")
			.attr("class", "contours")
			.attr("stroke", function(path) { return renderer.setContourColor(path) })
			.attr("stroke-width", function(path) { return renderer.setContourWidth(path) })
			.attr("fill", function(d) { return brighten(renderer.SVG_COLORMAP(d.value), 0.08); })
			.attr("d", scalarFieldTransformProjection )
			
			
		// add heightfield indicators
		console.log("Adding Height Indicators");
		this.computeHeightFieldIndicators(SCALARFIELD, paths, this.SVG_COLORMAP);

		// add shading
		if (PARAM_SHADING) {
			console.log("Computing Normal Field");
			var normalField = new NormalField(SCALARFIELD, 100 * PARAM_HEIGHT_SCALE / (PARAM_RANGE_MAX - PARAM_RANGE_MIN) );
			console.log("Extracting Shading Contour Paths");
			var shadingPaths = normalField.getShadingContourPaths(new vec(-0.5,-0.5,1).normalize());
			console.log("Adding Shading Layer");
			this.SVG_SHADING_CONTOURS = this.SHADING_LAYER.selectAll(".shadingContours")
				.data(shadingPaths)
				.enter().append("path")
				.attr("class","shadingContours")
				.attr("d", scalarFieldTransformProjection )
				.attr("fill", "rgb(253,253,254)")
				.style("mix-blend-mode", "multiply")
				.style("pointer-events", "none"); 
		}
	}
	
	
	sampleIndicators(scalarfield, gradientField, p, dir, indicators) 
	{
		const stepSize = 1;
		const minDist = PARAM_INDICATOR_FONTSIZE;

		var last_indicator = null;
		var gradient = new vec(1, 0);
		for (var i = 0; i < 5000; i++)
		{
			var value = scalarfield.sampleBilinear(p.x, p.y);
			if (isNaN(value))
				continue;
			
			// inter-heightfield value (fractional part within a contour line)
			var closest_contour_value = Math.floor(value / PARAM_CONTOUR_STEP) * PARAM_CONTOUR_STEP;
			var frac = value - closest_contour_value;
			if (frac >= PARAM_CONTOUR_STEP / 2)
				closest_contour_value += PARAM_CONTOUR_STEP;
			
			var contour_dist = Math.abs(value - closest_contour_value);
			if (contour_dist < PARAM_INDICATOR_EPSILON  && gradient && (!last_indicator || (last_indicator.value != closest_contour_value && distance(p, last_indicator) > minDist)))
			{
				last_indicator = {'x': p.x, 'y': p.y, 'value': closest_contour_value, 'gradient': gradient};
				indicators.push(last_indicator);
			}

			// continue sampling along the gradient
			var cell = scalarfield.map(p.x, p.y);
			gradient = gradientField.sampleBilinear(cell.x, cell.y);
			if (!gradient) 
				continue;
			
			if (gradient.norm() < stepSize * 0.001)
				return;        
			
			p = p.add(gradient.normalize().mul(dir * stepSize));
		}     
	}


	computeHeightFieldIndicators(scalarfield, paths, colormap)
	{
		var uvSeeds;
		
		if (PARAM_MANY_SEEDS) {
			uvSeeds = [
				new vec(0.2, 0.1), new vec(0.9, 0.2), new vec(0.8, 0.9), new vec(0.1, 0.8), new vec(0.5, 0.5),
				new vec(0.5, 0.1), new vec(0.1, 0.5), new vec(0.9, 0.5), new vec(0.5, 0.9),
			];
		}
		else {
			//uvSeeds = [new vec(0.3, 0.2), new vec(0.8, 0.6), new vec(0.4, 0.8)];
			uvSeeds = [new vec(0.3, 0.2), new vec(0.2, 0.8), new vec(0.8, 0.2), new vec(0.8, 0.8)];
		}
		
		var indicators = [];
	   
		var gradientField = new GradientField(scalarfield);
		
		// starting point
		uvSeeds.forEach(seed =>
		{
			var anchor = new vec(
				scalarfield.origin.x + seed.x * scalarfield.width * scalarfield.cellSize,
				scalarfield.origin.y + seed.y * scalarfield.height * scalarfield.cellSize
			);
			
			this.sampleIndicators(scalarfield, gradientField, anchor, 1, indicators);
			this.sampleIndicators(scalarfield, gradientField, anchor, -1, indicators);
		})
		
		
		// create SVG labels
		//----------------------------------------------------

		if (this.SVG_INDICATOR_LABELS)
			this.SVG_INDICATOR_LABELS.remove();

		this.SVG_INDICATOR_LABELS = this.TOPO_LAYER.selectAll(".indicator_labels")
			.data(indicators).enter()
			.append("text")
			.text(d => { return d.value.toFixed(1) / 1 })
			.style("fill", d => { return darken(colormap(d.value)); } )
			.style("font-family", "Arial")
			.style("font-size", PARAM_INDICATOR_FONTSIZE)
			.style("pointer-events", "none")  // to prevent mouseover/drag capture
			.attr("transform", this.placeIndicator)
	}
	
	
	placeIndicator(indicator) 
	{
		const labelwidth = PARAM_INDICATOR_FONTSIZE * 4.5;
		const labelheight = PARAM_INDICATOR_FONTSIZE;

		var pos = vec.copy(indicator);
		pos.y += labelheight * 0.;

		var transform = "translate(" + pos.x + ", " + pos.y + ") ";

		var v = new vec(indicator.gradient.y, -indicator.gradient.x).normalize();
		if (!isNaN(v.x) && !isNaN(v.y))
		{
			//if (v.x < 0) v = v.negate();
			//pos = pos.add(v.mul(-labelwidth / 2));
			//transform += "scale(1,-1) "

			var angle = Math.atan2(v.y, v.x) * 180 / Math.PI;
			transform = "translate(" + pos.x + ", " + pos.y + ")  rotate(" + angle + ")";

			if (v.x < 0)
				transform += "scale(-1,-1)  translate(" + (-labelwidth/2) + ", " + (+labelheight/2) + ")";
		}
		return transform;
	}

		
	placeTunnelEntry(tunnel, invert)
	{
		const len = 6;
		var pv0 = tunnel[invert ? 0 : 1];
		var pv1 = tunnel[invert ? 1 : 0];

		var v = pv1.sub(pv0);
		v.z = 0;
		v = v.normalize();

		var w = v.mul(-len * 0.5);
		var n = new vec(v.y, -v.x).mul(len);

		var p0 = pv0.add(n)
		var p1 = p0.add(w).add(n)
		var q0 = pv0.sub(n)
		var q1 = q0.add(w).sub(n)
		
		return [[p1.x, p1.y], [p0.x, p0.y], [q0.x, q0.y], [q1.x, q1.y]];
	}
	
	
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
	toggleLinks(showLinks)
	{
		var tunnelLinkOpacity = showLinks && PARAM_SHOW_TUNNELS ? PARAM_LINK_OPACITY : 0;
		if (this.SVG_LINKS_STREETS) this.SVG_LINKS_STREETS.attr("opacity", tunnelLinkOpacity)
		if (this.SVG_LINKS_TUNNELS) this.SVG_LINKS_TUNNELS.attr("opacity", tunnelLinkOpacity)
		if (this.SVG_TUNNEL_ENTRIES_1) this.SVG_TUNNEL_ENTRIES_1.attr("opacity", tunnelLinkOpacity)
		if (this.SVG_TUNNEL_ENTRIES_2) this.SVG_TUNNEL_ENTRIES_2.attr("opacity", tunnelLinkOpacity)
		
		if (this.SVG_LINKS) this.SVG_LINKS.attr("opacity", showLinks && (PARAM_ENERGIZE || !PARAM_SHOW_TUNNELS) ? PARAM_LINK_OPACITY : 0)
	}

	// Returns a string representation of the node to be used in tooltips
	getNodeAttributesAsString(node)
	{
		return node.name + (node.id ? " (" + node.id + ")" : "")
			+ "\nValue: " + node.value;
	}
}

