///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2020 Reinhold Preiner, Johanna Schmidt, Gabriel Mistelbauer
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////



function placeIndicator(indicator) 
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


function sampleIndicators(scalarfield, gradientField, p, dir, indicators) 
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


function computeHeightFieldIndicators(scalarfield, paths, colormap)
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
    
    indicators = [];
   
    var gradientField = new GradientField(scalarfield);
	
    // starting point
    uvSeeds.forEach(seed =>
    {
        var anchor = new vec(
            scalarfield.origin.x + seed.x * scalarfield.width * scalarfield.cellSize,
            scalarfield.origin.y + seed.y * scalarfield.height * scalarfield.cellSize
        );
        
        sampleIndicators(scalarfield, gradientField, anchor, 1, indicators);
        sampleIndicators(scalarfield, gradientField, anchor, -1, indicators);
    })
    
    
    // create SVG labels
    //----------------------------------------------------

    if (SVG_INDICATOR_LABELS)
        SVG_INDICATOR_LABELS.remove();

    SVG_INDICATOR_LABELS = TOPO_LAYER.selectAll(".indicator_labels")
		.data(indicators).enter()
		.append("text")
		.text(d => { return d.value.toFixed(1) / 1 })
        .style("fill", d => { return darken(colormap(d.value)); } )
        .style("font-family", "Arial")
		.style("font-size", PARAM_INDICATOR_FONTSIZE)
		.style("pointer-events", "none")  // to prevent mouseover/drag capture
        .attr("transform", placeIndicator)

    return SVG_INDICATOR_LABELS;
}


function tunnelEntryPlacement(tunnel, invert)
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

