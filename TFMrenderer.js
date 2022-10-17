///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////


// Parameters for Family Graph appearance
var PARAM_RANGE_UNIT_LEN = 3;
var PARAM_FAMILY_NODE_BORDER_COLOR = "#f88";
var PARAM_FAMILY_NODE_BORDER_WIDTH = 10;
var PARAM_FAMILY_FONT_SIZE = 16;
var PARAM_FAMILY_NODE_OPACITY = 0.7;

var PARAM_SHOW_LIFELINES = false;
var PARAM_LIFELINE_COLOR = "#e00";
var PARAM_LIFELINE_WIDTH = PARAM_NODE_RADIUS * 0.6;
var PARAM_LIFELINE_OPACITY = 1;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


class TFMRenderer extends TAMRenderer
{
	constructor() 
	{
		super();

        this.GRAPH;     // holds graph data for reference to enable dynamic graph rebuilding
		
		this.PNODES = [];
		this.FNODES = []
		this.LLNODES = [];
		this.FAMILYLINKS = [];
		
		this.SVG_FAMILY_CIRCLES;
		this.SVG_FAMILY_LABELS;
        this.SVG_LIFELINES;
	}

	createFamilyForceGraph(graph, nodePositions = null, lifelinePositions = null)
	{
        this.GRAPH = graph;     // save graph data temporarily to enable lifeline toggling
        var LINKS = [];
		
		// list persons
		//----------------------------------
		graph.persons.forEach(p =>
		{
			// set person data
			p.type = "PERSON";
			p.r = PARAM_NODE_RADIUS;
			p.cr = p.sex == FEMALE ? PARAM_NODE_RADIUS : 0;
			p.value = p.bdate ? p.bdate.getFullYear() : null;

			// set node positions (if available)
			if (nodePositions && nodePositions[p.id])
			{
				p.x = nodePositions[p.id].x;
				p.y = nodePositions[p.id].y;
				p.vis = { 'x': p.x, 'y': p.y };
				if (nodePositions[p.id].fixed) { // restore fixed state
					p.fx = p.x;
					p.fy = p.y;
				}
			}
			else
				p.vis = {'x': 0, 'y': 0};

			this.PNODES.push(p);


            // if active, create lifeline nodes
            if (PARAM_SHOW_LIFELINES)
            {
                if (true && p.bdate && p.ddate)
                {
                    var startVal = p.bdate.getFullYear();
                    var endVal = p.ddate.getFullYear();

                    const segmentRange = 30;      // number of years per lifeline segment
                    p.lifeline = [p];
                    var val = startVal; 
                    do
                    {   var step = Math.min(segmentRange, endVal - val);
                        val += step;
                        
                        // initialize node with random location scattered around the person location
                        // -> leads to a smooth 'growing' appearance of lifelines if dynamically switched on
                        var node = { 'type': "LIFELINENODE", 'value': val, 
                                     'x': p.x + 3 * PARAM_NODE_RADIUS * Math.random(),
                                     'y': p.y + 3 * PARAM_NODE_RADIUS * Math.random()
                                    }; 
                        var link = { "source": p.lifeline.at(-1), "target": node, "distance": step * PARAM_RANGE_UNIT_LEN };    // array.at(-1) retrieves last element in array
                        
                        p.lifeline.push(node);
                        this.LLNODES.push(node);
                        LINKS.push(link);
                    } 
                    while (val < endVal);

                    // apply saved lifeline positions, if available
                    if (lifelinePositions && lifelinePositions[p.id]) {
                        var llpos = lifelinePositions[p.id];
                        for (var i = 1; i < p.lifeline.length && i < llpos.length; i++) {
                            p.lifeline[i].x = llpos[i].x;
                            p.lifeline[i].y = llpos[i].y;
                        }
                    }
                }
            }
		});

		setRange(this.PNODES);
		
		
		// list families
		//----------------------------------
		graph.families.forEach((f, key) =>
		{
			// add family
			f.id = key;
			f.type = "FAMILY";

			// set node positions (if available)
			if (nodePositions && nodePositions[key])
			{
				f.x = nodePositions[key].x;
				f.y = nodePositions[key].y;
				f.vis = { 'x': f.x, 'y': f.y };
				if (nodePositions[key].fixed) { // restore fixed state
					f.fx = f.x;
					f.fy = f.y;
				}
			}
			else
				f.vis = {'x': 0, 'y': 0};

			f.familyname = (f.husband && f.husband.surname ? f.husband.surname : (f.wife && f.wife.surname ? f.wife.surname : "")).toUpperCase();

			// Show correct surnames in single-child families (Suggestion Walter Hess)
			//{
			//    f.familyname = "";
			//    if (f.husband && f.husband.surname) f.familyname = f.husband.surname.toUpperCase();
			//    else if (f.children.length == 1)    f.familyname = f.children[0].surname.toUpperCase();
			//}
						
			// compute value of this node
			if (f.children.length == 0) {
				f.value = null;
				if (f.husband && f.husband.bdate) f.value = f.husband.bdate.getFullYear();
				if (f.wife && f.wife.bdate && f.wife.bdate.getFullYear() > f.value) f.value = f.wife.bdate.getFullYear();
			}
			else {
				f.value = 1e20;
				f.children.forEach(c => { if (c.bdate && c.bdate.getFullYear() < f.value) f.value = c.bdate.getFullYear(); })
			}
			
			this.FNODES.push(f);
		});

		// link persons depending on ancestral graph appearance
		//-------------------------------------------------------------
		this.linkPersonsByFamilyNode(graph, LINKS);
				
		// Concat node links participating in force simulation in painter's order
		var NODES = this.FNODES.slice(0);
		this.LLNODES.forEach(n => NODES.push(n));
		this.PNODES.forEach(n => NODES.push(n));
        	
		
		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// FORCE SIMULATION OF FORCE-DIRECTED GRAPH

		this.REPULSION_FORCE = d3.forceManyBody().strength(-PARAM_REPULSION_STRENGTH);
		this.LINK_FORCE = d3.forceLink(LINKS).distance(function(d){ return d.distance; }).strength(PARAM_LINK_STRENGTH);
		
		// Initialize force field at the end
		this.FORCE_SIMULATION = d3.forceSimulation(NODES)
			.force("charge", this.REPULSION_FORCE)
			.force("x", d3.forceX(0).strength(PARAM_GRAVITY_X)) 
			.force("y", d3.forceY(0).strength(PARAM_GRAVITY_Y)) 
			.force("similarity", function (alpha) { renderer.similarityForce(renderer.PNODES, alpha); })
			.force("collision", d3.forceCollide().radius(function(d){ return d.r; }))
			.force("link", this.LINK_FORCE)
			.velocityDecay(PARAM_FRICTION)		// friction since d3.v4
			.alpha(PARAM_ALPHA)
			.alphaDecay(0)
			.on("tick", function tick() { renderer.tick(); })
			.on("end", function update() { renderer.updateScalarField(); });

		if (!PARAM_ENERGIZE) // this parameter may be loaded from an exported save file
			this.FORCE_SIMULATION.alpha(0); // stop simulation

		console.log("Force Graph Initialized.")
			

		/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		///  CREATE SVG ELEMENTS

		this.setColorMap();
		
		// bottom layer
		this.SVG_FAMILY_CIRCLES = this.GRAPH_LAYER.selectAll(".family")
			.data(this.FNODES).enter()
			.append("circle")
			.attr("class", "family")
			.style("fill", "fnodeColor")
			.style("stroke", PARAM_FAMILY_NODE_BORDER_COLOR)
			.style("stroke-width", PARAM_FAMILY_NODE_BORDER_WIDTH)
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", PARAM_FAMILY_NODE_OPACITY)
			.attr("r", function(f) { return f.r });
		
		this.SVG_LINKS = this.GRAPH_LAYER.selectAll(".link")
			.data(this.FAMILYLINKS).enter()
			.append("line")
			.attr("stroke", PARAM_LINK_COLOR)
			.attr("stroke-width", PARAM_LINK_WIDTH + "px")
			.attr("opacfity", PARAM_SHOW_LINKS ? PARAM_LINK_OPACITY : 0)
			.attr("marker-end","url(#arrow)");

        this.SVG_LIFELINES = this.GRAPH_LAYER.selectAll(".lifelines")
            .data(this.PNODES).enter()
            .append("polyline")
            .attr("fill","none")
            .attr("stroke", PARAM_LIFELINE_COLOR)
            .attr("stroke-width", PARAM_LIFELINE_WIDTH + "px")
            .attr("stroke-opacity", PARAM_LIFELINE_OPACITY);

		this.SVG_NODE_CIRCLES = this.GRAPH_LAYER.selectAll(".person")
			.data(this.PNODES).enter()
			.append("rect")
			.attr("class", "person")
			.style("fill", function(node) { return typeof(node.value) == "number" ? renderer.SVG_COLORMAP(node.value) : "red"; })
			.style("stroke", "#222")
			.attr("stroke-width", (PARAM_NODE_RADIUS / 4) + "px")
			.attr("width", function (f) { return 2 * f.r })
			.attr("height", function (f) { return 2 * f.r })
			.attr("rx", function (f) { return f.cr })
			.attr("ry", function (f) { return f.cr });
		
		if (PARAM_SHOW_NAMES)
			this.showNames();

		console.log("SVG Elements Initialized.")
			
		// Setup interactions
		this.SVG_DRAGABLE_ELEMENTS = this.GRAPH_LAYER.selectAll(".family,.person");
		initInteractions();
		console.log("Interactions Initialized.")
	}


	linkPersonsByFamilyNode(graph, LINKS)
	{
		//-- link family nodes with children and compute family node radius
		graph.families.forEach(f =>
		{
			const familyDefaultRadius = Math.max(2.5 * PARAM_NODE_RADIUS, Math.sqrt(f.children.length * 9 * PARAM_NODE_RADIUS * PARAM_NODE_RADIUS));
			f.r = familyDefaultRadius;

			f.children.forEach(c => 
			{
				// determine distance of child from family center for visualization of age differences
				c.fnodedist = familyDefaultRadius * 0.5;
				if (c.bdate) c.fnodedist += (c.bdate.getFullYear() - f.value) * PARAM_RANGE_UNIT_LEN;

				// family circle radius has to encompass all childs
				f.r = Math.max(f.r, c.fnodedist);
				
				var link = { "source": f, "target": c, "distance": PARAM_LINK_DISTANCE * 0.2 };     // 20 %
				LINKS.push(link);

				c.parentFamily = f;
			});
		});

		//-- link family node with parents
		graph.families.forEach(f => 
		{
			var sources = [];
			if (f.husband) sources.push(f.husband);
			if (f.wife) sources.push(f.wife);
			sources.forEach(source => 
			{
				var link = { "source": source, "target": f, "distance": PARAM_LINK_DISTANCE * 0.8 + f.r }   // 80 % + family radius
				LINKS.push(link);
				this.FAMILYLINKS.push(link);
			})
		});
	}


	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	tick()
	{
		// only update visualization each N iterations for performance
		if ((this.tickCounter++) % PARAM_RENDER_UPDATE_INTERVAL)
			return;
			
		
        this.SVG_NODE_CIRCLES.each(p =>
        {
            // clamp simulation position to boundard of parent family circle (avoid being too close to family or sibling nodes to avoid exploding forces)
            // the simulation position p is where lifelines are attached to, we therefore want p as close to the final vis position p.vis as possible
            if (p.parentFamily) 
            {
                var dist = distance(p, p.parentFamily);	// actual distance between node positions
                if (dist > p.parentFamily.r){
                    var fac = (dist - p.parentFamily.r) / dist;
                    p.x += (p.parentFamily.x - p.x) * fac;
                    p.y += (p.parentFamily.y - p.y) * fac;
                }
            }

            // set visualization position p.vis. By default, this is the simulation position
            p.vis.x = p.x;
            p.vis.y = p.y;

            if (p.parentFamily)     // in case of families, clamp to alternative vis position inside the parent family circle
            {
                if (p.parentFamily.children.length == 1)    // single child -> visualize at family circle center
                {
                    p.vis.x = p.parentFamily.x;
                    p.vis.y = p.parentFamily.y;
                }
                else    // multiple siblings -> visualize at age-dependendent distance from family center.
                {
                    var dist = distance(p.vis, p.parentFamily);	// actual distance between node vis positions
                    if (dist > p.fnodedist){
                        var fac = (dist - p.fnodedist) / dist;
                        p.vis.x += (p.parentFamily.x - p.vis.x) * fac;
                        p.vis.y += (p.parentFamily.y - p.vis.y) * fac;
                    }
                }
            }
        });
		
		this.SVG_FAMILY_CIRCLES.each(f => {
			f.vis.x = f.x; 
			f.vis.y = f.y;
		});

			
		// move family and persons circles to defined position (d.x,d.y)
		this.SVG_NODE_CIRCLES.attr("x", function (p) { return p.vis.x - p.r; }).attr("y", function (p) { return p.vis.y - p.r; });
		this.SVG_FAMILY_CIRCLES.attr("cx", function(f) { return f.vis.x; }).attr("cy", function(f) { return f.vis.y; }).attr("r", function(f) { return f.r; });
		
			
		// set links
		this.SVG_LINKS
			.attr("x1", function(d) { return d.source.vis.x; })
			.attr("y1", function(d) { return d.source.vis.y; })
			.attr("x2", function(d) { 
				//if (d.target.type != "FAMILY") return d.target.x;
				var l = distance(d.source.vis, d.target.vis), t = (l - d.target.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;
				var x = d.source.vis.x * (1-t) + d.target.vis.x * t;
				return isNaN(x) ? d.target.vis.x : x;
			})
			.attr("y2", function(d) { 
				//if (d.target.type != "FAMILY") return d.target.y;
				var l = distance(d.source.vis, d.target.vis), t = (l - d.target.r - PARAM_ARROW_DISTANCE_FACTOR * PARAM_ARROW_RADIUS) / l;  
				var y = d.source.vis.y * (1-t) + d.target.vis.y * t;
				return isNaN(y) ? d.target.vis.y : y;
			})
		
        // update lifeline points
        if (this.SVG_LIFELINES)
        {	
            this.SVG_LIFELINES.attr('points', function(p) {
                var path = [];    
                if (p.lifeline) 
                {
                    // smooth the simulation points of the curve to avoid bends
                    for (var i = 1; i < p.lifeline.length-1; i++) {  
                        p.lifeline[i].x = p.lifeline[i].x * 0.2 + (p.lifeline[i-1].x + p.lifeline[i+1].x) * 0.4;
                        p.lifeline[i].y = p.lifeline[i].y * 0.2 + (p.lifeline[i-1].y + p.lifeline[i+1].y) * 0.4;
                    }
                    
                    // define visualized lifeline path
                    path.push([p.vis.x, p.vis.y]);  // first lifeline node is the person itself -> anchor at its .vis position
                    for (var i = 1; i < p.lifeline.length; i++)
                        path.push([ p.lifeline[i].x, p.lifeline[i].y ]);
                }
                return path;
            })
        }

		// set labels
		if (PARAM_SHOW_NAMES)
		{
			this.SVG_NODE_LABELS.attr("transform", this.placeLabel)
			this.SVG_FAMILY_LABELS.attr("transform", this.placeLabel);
		}
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	hideNames()
	{
		this.SVG_FAMILY_LABELS.remove();
		this.SVG_NODE_LABELS.remove();
	}

	showNames()
	{
		// person labels
		//-----------------------------------------------------------------
		this.SVG_NODE_LABELS = this.GRAPH_LAYER.selectAll(".personlabels")
			.data(this.PNODES).enter()
			.append("text")
			.text(function(node) { return node.givenname; })
			.style("fill", PARAM_LABEL_COLOR)
			.style("stroke", "white")
			.style("stroke-width", PARAM_FONT_SIZE / 5)
			.style("paint-order", "stroke")
			.style("font-family", "Calibri")
			.style("font-size", PARAM_FONT_SIZE)
			.style("pointer-events", "none")  // to prevent mouseover/drag capture
			.style("opacity", PARAM_PERSON_LABEL_OPACITY)
			
		// compute label lengths and store them
		this.SVG_NODE_LABELS.each(function(d) { d.labelwidth = this.getComputedTextLength(); })
		// now adjust label position based on label lengths
		this.SVG_NODE_LABELS.attr("transform", this.placeLabel)

		
		// family labels
		//-----------------------------------------------------------------
		this.SVG_FAMILY_LABELS = this.GRAPH_LAYER.selectAll(".familylabels")
			.data(this.FNODES).enter()
			.append("text")
			.text(function(d) { return d.familyname; })
			.style("fill", "black")
			.style("stroke", "white")
			.style("stroke-width", PARAM_FAMILY_FONT_SIZE / 5)
			.style("paint-order", "stroke")
			.style("opacity", PARAM_FAMILY_NODE_OPACITY)
			.style("font-family", "Calibri")
			.style("font-size", PARAM_FAMILY_FONT_SIZE)
			.style("pointer-events", "none")  // to prevent mouseover/drag capture
			
		// compute label lengths and store them
		this.SVG_FAMILY_LABELS.each(function(d) { d.labelwidth = this.getComputedTextLength(); })
		// now adjust label position based on label lengths
		this.SVG_FAMILY_LABELS.attr("transform", this.placeLabel)
	}


	placeLabel(node)
	{
        // lifeline present (only for person nodes) and sufficiently long
        if (node.lifeline && node.lifeline.length > 1)
        {
            // find actually visible path and its mid length
            var len = 0;
            var path = [node.vis];
            var dists = [0];
            for (var i = 1; i < node.lifeline.length; i++) {
                path.push(node.lifeline[i]);
                dists.push( distance(path.at(-2), path.at(-1)) );
                len += dists.at(-1);
            }
            len *= 0.5;
            
            for (var i = 1; i < path.length; i++)
            {
                if (dists[i] > len)
                {
                    // align label with this segment
                    var x0 = vec.copy(path[i-1]);
                    var x1 = vec.copy(path[i]);
                    var v = x1.sub(x0).div(dists[i]);    // if dists[i] is zero, len wouldn't fall in this segment 
                    
                    // center position
                    var pos = x0.add(v.mul(len));

                    // angle
                    if (v.x < 0) v = v.negate();
                    var n = new vec(v.y, -v.x);
                    var angle = Math.atan2(v.y, v.x) * 57.3;       // 180/pi. atan2 is quite expensive in JS

                    pos = pos.add(v.mul(-node.labelwidth * 0.5)).add(n.mul(PARAM_LIFELINE_WIDTH));
                                
                    return "translate(" + pos.x + ", " + pos.y + ")  rotate(" + angle + ")";
                }
                len -= dists[i];
            }
        }
         
        // if lifeline-based label position not possible or successful, use default label positioning
        if (PARAM_PERSON_LABELS_BELOW_NODE)
		{
			// below the node
			var x = node.vis.x - node.labelwidth * 0.5;
			var y = node.vis.y + node.r + 1.0 * PARAM_FONT_SIZE;
			return "translate(" + x + ", " + y + ")";
		}
		else
		{
			// right beside the node
			var x = node.vis.x + 1.5 * node.r;
			var y = node.vis.y + PARAM_FONT_SIZE/4;
			return "translate(" + x + ", " + y + ")";
		}
	}

	// Update function for scalar field and associated contour map
	updateScalarField()
	{
		// remove old paths		
		this.resetScalarField();
		
		//--- 1. List height field constraints
		var topopoints = [];

		// add constraints at person positions
		this.PNODES.forEach(p => 
        {
			if (isNumber(p.value)) 
                topopoints.push({ 'x' : p.vis.x, 'y': p.vis.y, 'value' : p.value });

            // if present, create topopoints for lifelines
            if (p.lifeline) 
            {
                // Note: p.lifeline[0] does not equal its visualized starting point, but the simulation point of the person
                var path = p.lifeline.slice(0);
                path[0].x = p.vis.x;
                path[0].y = p.vis.y;

                for (var j = 0; j < path.length-1; j++) 
                {
                    var pv0 = new vec(path[j].x, path[j].y, path[j].value);
                    var pv1 = new vec(path[j+1].x, path[j+1].y, path[j+1].value);
                    var v = pv1.sub(pv0);
                    var nsteps = v.norm() / PARAM_LINK_SAMPLE_STEPSIZE;
                    if (nsteps > 0) {
                        v = v.div(nsteps);
                        for (var i = 0, pv = pv0; i < nsteps; i++, pv = pv.add(v))
                            topopoints.push({ 'x' : pv.x, 'y': pv.y, 'value' : pv.z });
                    }
                }
            }
		})
			
		
        if (PARAM_EMBED_LINKS)
		{
			// Create Topopoints for Family Links
		    this.FAMILYLINKS.forEach(link => {
				if (link.source.value && link.target.value) {
					var pv0 = new vec(link.source.vis.x, link.source.vis.y, link.source.value);
					var pv1 = new vec(link.target.vis.x, link.target.vis.y, link.target.value);
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
			this.FAMILYLINKS.forEach(link =>
			{
				if (link.source.value && link.target.value)
				{
					// determine 2D start and endpoint on map, respecting some offsets
					var pv0 = new vec(link.source.vis.x, link.source.vis.y, link.source.value);
					var pv1 = new vec(link.target.vis.x, link.target.vis.y, link.target.value);
				
					SEGMENTS.push({ 'pv0': pv0, 'pv1': pv1, 'directed': true, 'r1': link.target.r });
				}
			});
			
			// create tunnels
			this.createTunnels(SCALARFIELD, SEGMENTS);


			if (this.SVG_NODE_CIRCLES) this.SVG_NODE_CIRCLES.raise();	
			//if (this.SVG_FAMILY_CIRCLES) this.SVG_FAMILY_CIRCLES.raise();	// needs to stay below links
			if (this.SVG_NODE_LABELS) this.SVG_NODE_LABELS.raise();
			if (this.SVG_FAMILY_LABELS) this.SVG_FAMILY_LABELS.raise();
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

	// Returns a string representation of the node to be used in tooltips
	getNodeAttributesAsString(node)
	{
		if (node.type == "PERSON")
		{

			const age = node.bdate && node.ddate
				? Math.floor((node.ddate - node.bdate) / 31536000000) // 1000ms * 60s * 60min * 24h * 365d
				: "unknown";
			const mother = node.getMother();
			const father = node.getFather();

			return node.getFullName() + (node.id ? " (" + node.id + ")" : "")
				+ "\n\nBirth: " + (node.bdate ? node.bdate.toLocaleDateString() : "unknown")
				+ "\nDeath: " + (node.ddate ? node.ddate.toLocaleDateString() : "unknown")
				+ "\nAge: " + age
				+ "\nMother: " + (mother ? mother.getFullName() + " (" +  mother.id + ")" : "unknown")
				+ "\nFather: " + (father ? father.getFullName() + " (" +  father.id + ")" : "unknown");
		}
		else if (node.type == "FAMILY")
		{
			const wife = node.wife;
			const husband = node.husband;

			return node.familyname + (node.id ? " (" + node.id + ")" : "")
				+ "\n\nWife: " + (wife ? wife.getFullName() + " (" + wife.id + ")" : "unknown")
				+ "\nHusband: " + (husband ? husband.getFullName() + " (" + husband.id + ")" : "unknown")
				+ "\nChildren: " + (node.children ? node.children.length : "unknown")
				+ "\nFirst child: " + (node.value ? node.value : "unknown");;
		}
		else
		{
			return "unknown";
		}
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    saveData()
	{
        // store person/family node positions with their id
		let nodePositions = {};
        this.FNODES.forEach(f => { nodePositions[f.id] = {"x": f.x, "y": f.y, "fixed": f.fx != null}; });
        this.PNODES.forEach(p => { nodePositions[p.id] = {"x": p.x, "y": p.y, "fixed": p.fx != null}; });
		
        let lifelinePositions = {};
        this.PNODES.forEach(p => { 
            if (p.lifeline) {
                var llnodes = [];
                p.lifeline.forEach(ll => { llnodes.push({"x": ll.x, "y": ll.y }); });
                lifelinePositions[p.id] = llnodes;
            }
        });
		
        let content = [JSON.stringify(
            {
                "metadata": getMetadata(),
                "parameters": getParameters(),
                "nodePositions": nodePositions,
                "lifelinePositions": lifelinePositions
            },
            null, 2)];
        let blob = new Blob(content, { type: "text/json" });
		let filenameWithoutSuffix = PARAM_FILENAME.slice(0, PARAM_FILENAME.lastIndexOf('.'));

		createDownloadFromBlob(blob, filenameWithoutSuffix + ".tfm");
	}
}

