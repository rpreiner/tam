///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////



function initInteractions() 
{
	// Add pattern for single heightfield selection and highlighting
	renderer.CANVAS.append("defs").append("pattern")
		.attr("id","myPattern")
		.attr("width", 40)
		.attr("height", 40)
		.attr("patternUnits","userSpaceOnUse")
		.append("path")
		.attr("fill","none")
		.attr("stroke","#111")
		.attr("stroke-width","2") 
		//.attr("d","M-1,1 l2,-2 M0,20 l20,-20 M19,21 l2,-2");
		.attr("d","M0,40 l40,-40 M0,0 l40,40");

	// initialize Menubar
	initMenubar();

	// initilaize zoom and pan capabilities
	d3.select("#tam").call(
		d3.zoom()
			.scaleExtent([.01, 100])
			.on("zoom", function() { renderer.CANVAS.attr("transform", d3.event.transform); })
	);

	// initialize tooltips for hovering over nodes
	initTooltip();

	// define interaction possibilities for graph svg
	setTAMInteractions();

	// define interaction possibilities for menu bar
	setMenubarInteractions();
}


/////////////////////////////////////////////////////////////////////////////
///  SVG INTERACTIONS

function setTAMInteractions()
{
	// events
	d3.select("body")
		.on("keydown", function() {
			if (d3.event.keyCode == "S".charCodeAt(0)) {
				toggleShading();
				d3.select("#settings_shading").property('checked', PARAM_SHADING);
			}
			else if (d3.event.keyCode == "R".charCodeAt(0)) {
				toggleReverseColormap();
				d3.select("#settings_reversecolor").property('checked', PARAM_REVERSE_COLORMAP);
			}
			else if (d3.event.keyCode == "H".charCodeAt(0)) {
				toggleSelectTime();
				d3.select("#settings_select_time").property('checked', PARAM_USE_MOUSEOVER);
			}
			else if (d3.event.keyCode == "I".charCodeAt(0)) {
				toggleShowTooltips();
				d3.select("#settings_show_tooltips").property('checked', PARAM_SHOW_TOOLTIPS);
			}
			else if (d3.event.keyCode == "F".charCodeAt(0)) {
				toggleEnergizeSimulation();
				d3.select("#settings_freeze").property('checked', !PARAM_ENERGIZE);
			}
			else if (d3.event.keyCode == "N".charCodeAt(0)) {
				toggleNames();
				d3.select("#settings_show_names").property('checked', PARAM_SHOW_NAMES);
			}
			else if(d3.event.keyCode == "G".charCodeAt(0)) {
				toggleShowGraph();
				d3.select("#settings_show_graph").property('checked', PARAM_SHOW_GRAPH);
			}
			else if (d3.event.keyCode == "M".charCodeAt(0)) {
				toggleShowContours();
				d3.select("#settings_show_contours").property('checked', PARAM_SHOW_CONTOURS);
			}
			else if (d3.event.keyCode == "L".charCodeAt(0)) {
				toggleLinks();
				d3.select("#settings_show_links").property('checked', PARAM_SHOW_LINKS);
			}
			else if (d3.event.keyCode == "T".charCodeAt(0)) {
				toggleShowTunnels();
				d3.select("#settings_show_tunnels").property('checked', PARAM_SHOW_TUNNELS);
			}
			else if (d3.event.keyCode == "E".charCodeAt(0)) {
				document.getElementById("btnSvgExport").click();
			}
		});
	
	// make nodes draggable
	renderer.SVG_DRAGABLE_ELEMENTS.call(d3.drag()
		.on("start", dragStartNode)
		.on("drag", dragNode)
		.on("end", dragEndNode)
	);
}
//---------------------------------------------------------------------------
function mouseoverContour(c)
{
	renderer.SVG_CONTOURS
		.attr("fill",
			function(d)
			{
				// Currently selected one will be always at 0.5
				if (c.value === d.value)
				{
					return "url(#myPattern) #000";//chromadepth(0.5);
				}
				return renderer.SVG_COLORMAP(d.value);
			}
		);
}
//---------------------------------------------------------------------------
function dragStartNode(d)
{
	d3.event.sourceEvent.stopPropagation();
	if (!d3.event.active)
	{
		renderer.resetScalarField();

		if (!PARAM_ENERGIZE)
			renderer.FORCE_SIMULATION.velocityDecay(1);	// don't move anything than the selected node!

		renderer.FORCE_SIMULATION.alpha(PARAM_ALPHA).restart();
	}
	d.fx = d.x;
	d.fy = d.y;

	if (PARAM_SHOW_TOOLTIPS)
		d3.select("#tooltip").style("opacity", PARAM_TOOLTIP_DRAG_OPACITY);
}
//---------------------------------------------------------------------------
function dragNode(d)
{
	d.fx = d3.event.x;
	d.fy = d3.event.y;

	if (PARAM_SHOW_TOOLTIPS)
		d3.select("#tooltip")
			.style("top", (d3.event.sourceEvent.pageY - 10) + "px")
			.style("left", (d3.event.sourceEvent.pageX + 15) + "px");
}
//---------------------------------------------------------------------------
function toggleEnergizeSimulation()
{
	PARAM_ENERGIZE = !PARAM_ENERGIZE;
	if (PARAM_ENERGIZE)
	{
		renderer.resetScalarField();
		renderer.FORCE_SIMULATION.alpha(PARAM_ALPHA).restart();
	}
	else
		renderer.FORCE_SIMULATION.alpha(0);
}
//---------------------------------------------------------------------------
function dragEndNode(d)
{
	if (!d3.event.active && !PARAM_ENERGIZE)
		renderer.FORCE_SIMULATION.velocityDecay(PARAM_FRICTION).alpha(0);	// reset friction

	d.fx = null;
	d.fy = null;

	if (PARAM_SHOW_TOOLTIPS)
		d3.select("#tooltip").style("opacity", 1.0);
}
//---------------------------------------------------------------------------
function toggleShading()
{
	PARAM_SHADING = !PARAM_SHADING;
	renderer.SHADING_LAYER.attr("visibility", PARAM_SHOW_CONTOURS && PARAM_SHADING ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleLinks()
{
	PARAM_SHOW_LINKS = !PARAM_SHOW_LINKS;
	renderer.toggleLinks(PARAM_SHOW_LINKS);
}
//---------------------------------------------------------------------------
function toggleShowGraph()
{
	PARAM_SHOW_GRAPH = !PARAM_SHOW_GRAPH;
	renderer.GRAPH_LAYER.attr("visibility", PARAM_SHOW_GRAPH ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleShowContours()
{
	PARAM_SHOW_CONTOURS = !PARAM_SHOW_CONTOURS;
	renderer.TOPO_LAYER.attr("visibility", PARAM_SHOW_CONTOURS ? "visible" : "hidden");
	renderer.SHADING_LAYER.attr("visibility", PARAM_SHOW_CONTOURS && PARAM_SHADING ? "visible" : "hidden");
}
//---------------------------------------------------------------------------
function toggleNames()
{
	PARAM_SHOW_NAMES = !PARAM_SHOW_NAMES;
	if (PARAM_SHOW_NAMES)
		renderer.showNames();
	else
		renderer.hideNames();
}
//---------------------------------------------------------------------------
function toggleShowTunnels()
{
	PARAM_SHOW_TUNNELS = !PARAM_SHOW_TUNNELS;
	if (!PARAM_ENERGIZE) renderer.updateScalarField();
}
//---------------------------------------------------------------------------
function toggleReverseColormap() 
{
	PARAM_REVERSE_COLORMAP = !PARAM_REVERSE_COLORMAP;
	renderer.setColorMap();
	if (!PARAM_ENERGIZE) renderer.updateScalarField();
}
//---------------------------------------------------------------------------
function toggleSelectTime()
{
	PARAM_USE_MOUSEOVER = !PARAM_USE_MOUSEOVER;
	if (PARAM_USE_MOUSEOVER) {
		renderer.TOPO_LAYER.selectAll("path.contours").on("mouseover", mouseoverContour);
	} else {
		renderer.resetColormap();
		renderer.TOPO_LAYER.selectAll("path.contours").on("mouseover", null);
	}
}
//---------------------------------------------------------------------------
function toggleShowTooltips()
{
	PARAM_SHOW_TOOLTIPS = !PARAM_SHOW_TOOLTIPS;
	registerTooltipEventhandler();
}

/////////////////////////////////////////////////////////////////////////////
///  MENUBAR INTERACTIONS

function initMenubar()
{
	d3.select("#settings_shading").property('checked', PARAM_SHADING);
	d3.select("#settings_reversecolor").property('checked', PARAM_REVERSE_COLORMAP);
	d3.select("#settings_dataset").property("value", PARAM_FILENAME);
	d3.select("#settings_noderadius").property("value", PARAM_NODE_RADIUS);
	d3.select("#settings_linkwidth").property("value", PARAM_LINK_WIDTH);
	d3.select("#settings_pnodeopacity").property("value", PARAM_PERSON_LABEL_OPACITY);
	
	// Force Simulation
	d3.select("#settings_repulsion_strength").property("value", PARAM_REPULSION_STRENGTH);
	d3.select("#settings_gravity_x").property('value', PARAM_GRAVITY_X);
	d3.select("#settings_gravity_y").property('value', PARAM_GRAVITY_Y);
	d3.select("#settings_link_strength").property("value", PARAM_LINK_STRENGTH);	
	d3.select("#settings_friction").property("value", PARAM_FRICTION);
	d3.select("#settings_simforce_strength").property("value", PARAM_SF_STRENGTH);	

	// Appearance
	d3.select("#settings_interpolation_type").property("checked", PARAM_INTERPOLATE_NN);
	d3.select("#settings_embed_links").property("checked", PARAM_EMBED_LINKS);
	d3.select("#settings_show_contours").property("checked", PARAM_SHOW_CONTOURS);	
	d3.select("#settings_show_graph").property("checked", PARAM_SHOW_GRAPH);	
	d3.select("#settings_show_links").property("checked", PARAM_SHOW_LINKS);	
	d3.select("#settings_show_names").property("checked", PARAM_SHOW_NAMES);	
	d3.select("#settings_show_tunnels").property("checked", PARAM_SHOW_TUNNELS);	
	d3.select("#settings_dilation_degree").property("value", PARAM_SCALARFIELD_DILATION_ITERS);	
	d3.select("#settings_contour_step").property("value", PARAM_CONTOUR_STEP);
	d3.select("#settings_contour_big_step").property("value", PARAM_CONTOUR_BIG_STEP);	
	d3.select("#settings_indicator_size").property("value", PARAM_INDICATOR_FONTSIZE);	
	d3.select("#settings_range_min").property("value", PARAM_RANGE_MIN);	
	d3.select("#settings_range_max").property("value", PARAM_RANGE_MAX);	
	d3.select("#settings_height_scale").property("value", PARAM_HEIGHT_SCALE);		
	d3.select("#settings_resolution").property("value", PARAM_SCALARFIELD_RESOLUTION);	
	d3.select("#settings_link_sample_step").property("value", PARAM_LINK_SAMPLE_STEPSIZE);	
	d3.select("#settings_underground_threshold").property("value", PARAM_UNDERGROUND_THRESHOLD);	

	// Interactive features
	d3.select("#settings_show_tooltips").property("checked", PARAM_SHOW_TOOLTIPS);
}
//---------------------------------------------------------------------------
function setMenubarInteractions()
{
	d3.select("#settings_interpolation_type").on("input", function() {
		PARAM_INTERPOLATE_NN = this.checked;
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});

	d3.select("#settings_contour_step").property("value", PARAM_CONTOUR_STEP).on("input", function() {
		PARAM_CONTOUR_STEP = parseFloat(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_contour_big_step").on("input", function() {
		PARAM_CONTOUR_BIG_STEP = parseFloat(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_noderadius").on("input", function() {
		PARAM_NODE_RADIUS = parseInt(this.value);
		if (renderer.SVG_NODE_CIRCLES) renderer.SVG_NODE_CIRCLES.attr("r", PARAM_NODE_RADIUS)
	});
	d3.select("#settings_linkdist").on("input", function() {
		PARAM_LINK_DISTANCE = parseInt(this.value);
	});
	
	d3.select("#settings_linkwidth").on("input", function() {
		PARAM_LINK_WIDTH = parseInt(this.value);
		if (renderer.SVG_LINKS)	renderer.SVG_LINKS.attr("stroke-width", PARAM_LINK_WIDTH + "px");
		if (renderer.SVG_LINKS_STREETS) renderer.SVG_LINKS_STREETS.attr("stroke-width", PARAM_LINK_WIDTH + "px");
		if (renderer.SVG_LINKS_TUNNELS) renderer.SVG_LINKS_TUNNELS.attr("stroke-width", PARAM_LINK_WIDTH + "px");
		if (renderer.SVG_TUNNEL_ENTRIES_1) renderer.SVG_TUNNEL_ENTRIES_1.attr("stroke-width", PARAM_LINK_WIDTH + "px");
		if (renderer.SVG_TUNNEL_ENTRIES_2) renderer.SVG_TUNNEL_ENTRIES_2.attr("stroke-width", PARAM_LINK_WIDTH + "px");
	});
	d3.select("#settings_pnodeopacity").on("input", function() {
		PARAM_PERSON_LABEL_OPACITY = parseFloat(this.value);
		if (renderer.SVG_NODE_LABELS) renderer.SVG_NODE_LABELS.style("opacity", PARAM_PERSON_LABEL_OPACITY);
	});
	d3.select("#settings_simforce_strength").on("input", function() {
		PARAM_SF_STRENGTH = parseFloat(this.value);	
	});
	d3.select("#settings_repulsion_strength").on("input", function() {
		PARAM_REPULSION_STRENGTH = this.value;	
		renderer.REPULSION_FORCE.strength(-PARAM_REPULSION_STRENGTH);
	});
	d3.select("#settings_link_strength").on("input", function() {
		PARAM_LINK_STRENGTH = this.value;	
		renderer.LINK_FORCE.strength(PARAM_LINK_STRENGTH);
	});
	d3.select("#settings_friction").on("input", function() {
		PARAM_FRICTION = parseFloat(this.value);
		renderer.FORCE_SIMULATION.velocityDecay(PARAM_FRICTION);
	});
	d3.select("#settings_gravity_x").on("input", function() {
		PARAM_GRAVITY_X = parseFloat(this.value);
		renderer.FORCE_SIMULATION.force("x", d3.forceX(0).strength(PARAM_GRAVITY_X)) 
	});
	d3.select("#settings_gravity_y").on("input", function() {
		PARAM_GRAVITY_Y = parseFloat(this.value);
		renderer.FORCE_SIMULATION.force("y", d3.forceY(0).strength(PARAM_GRAVITY_Y)) 
	});
	d3.select("#settings_embed_links").on("input", function() {
		PARAM_EMBED_LINKS = !PARAM_EMBED_LINKS;
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_dilation_degree").on("input", function() {
		PARAM_SCALARFIELD_DILATION_ITERS = parseFloat(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_show_names").on("input", function() {
		toggleNames();
	});
	d3.select("#settings_indicator_size").on("input", function() {
		PARAM_INDICATOR_FONTSIZE = this.value;
		if (renderer.SVG_INDICATOR_LABELS) renderer.SVG_INDICATOR_LABELS.style("font-size", PARAM_INDICATOR_FONTSIZE);
	});
	d3.select("#settings_show_tunnels").on("input", function () {
		toggleShowTunnels();
	});
	d3.select("#settings_show_contours").on("input", function() {
		toggleShowContours();
	});
	d3.select("#settings_show_graph").on("input", function() {
		toggleShowGraph();
	});
	d3.select("#settings_show_links").on("input", function() {
		toggleLinks();
	});
	d3.select("#settings_shading").on("click", function(e){
		toggleShading();
	});		
	d3.select("#settings_reversecolor").on("click", function(e){
		toggleReverseColormap();
	});	
	d3.select("#settings_select_time").on("click", function(e){
		toggleSelectTime();
	});	
	d3.select("#settings_freeze").on("click", function (e) {
		toggleEnergizeSimulation();
	});		
	d3.select("#settings_show_tooltips").on("click", function (e) {
		toggleShowTooltips();
	});
	d3.select("#settings_range_min").on("input", function() {
		PARAM_RANGE_MIN = parseFloat(this.value);
		renderer.setColorMap();
		renderer.updateRange();		
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_range_max").on("input", function() {
		PARAM_RANGE_MAX = parseFloat(this.value);
		renderer.setColorMap();
		renderer.updateRange();
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_height_scale").on("input", function() {
		PARAM_HEIGHT_SCALE = parseFloat(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_resolution").on("input", function() {
		PARAM_SCALARFIELD_RESOLUTION = parseInt(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_link_sample_step").on("input", function() {
		PARAM_LINK_SAMPLE_STEPSIZE = parseInt(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
	d3.select("#settings_underground_threshold").on("input", function() {
		PARAM_UNDERGROUND_THRESHOLD = parseFloat(this.value);
		if (!PARAM_ENERGIZE) renderer.updateScalarField();
	});
}
//---------------------------------------------------------------------------

function initTooltip()
{
	d3.select("#tooltip").remove(); // remove any previous elements
	d3.select("body").append("div").attr("id", "tooltip");
	registerTooltipEventhandler();
}

function registerTooltipEventhandler()
{
	if (PARAM_SHOW_TOOLTIPS) {
		let tooltip = d3.select("#tooltip");
		renderer.SVG_DRAGABLE_ELEMENTS
			.on("mouseover", function (node) {
				return tooltip.style("visibility", "visible");
			})
			.on("mouseenter", function (node) { // insert tooltip content
				let tooltipString = renderer.getNodeAttributesAsString(node);
				return tooltip.text(tooltipString);
			})
			.on("mousemove", function () { // adjust tooltip position
				return tooltip
					.style("top", (d3.event.pageY - 10) + "px")
					.style("left", (d3.event.pageX + 15) + "px");
			})
			.on("mouseout", function () {
				return tooltip.style("visibility", "hidden");
			});
	} else {
		renderer.SVG_DRAGABLE_ELEMENTS
			.on("mouseover", null)
			.on("mouseenter", null)
			.on("mousemove", null)
			.on("mouseout", null)
		d3.select("#tooltip").style("visibility", "hidden");
	}
}

