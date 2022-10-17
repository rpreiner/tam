///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2021 Reinhold Preiner
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////


const TAM_DESCRIPTION = "Topographic Attribute Maps Demo";

var downloadableFile = null;

function createDownloadSVG(svgText, filename)
{
    const data = new Blob([svgText], { type: 'image/svg+xml' });
    const a = document.createElement('a');

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (downloadableFile !== null)
        window.URL.revokeObjectURL(downloadableFile);
    downloadableFile = URL.createObjectURL(data);

    a.href = downloadableFile;
    a.download = filename;
    a.click();
}


///////////////////////////////////////////////////////////////////////////////

function createDownloadFromBlob(blob, filename)
{
    const a = document.createElement('a');
    a.download = filename;
    a.href = URL.createObjectURL(blob);

    // revoke URL after 60s to free memory
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    setTimeout(() => a.click(), 0);
}


// Remove unnecessary values from data before export.
// This is "replacing function" for JSON.stringify().
function removeInternalValuesFromJSON(key, value)
{
    switch (key)
    {
        case "source":
        case "target":
            return value.id; // don't include the whole node object, only the id

        case "index":
        case "distance":
        case "r":
        case "vx":
        case "vy":
        case "fx":
        case "fy":
        case "labelwidth":
            return undefined; // ignore

        default:
            return value;
    }
}


function getParameters()
{
    let params =
    {
        // Menu "Interaction"
        "PARAM_ENERGIZE" : PARAM_ENERGIZE,
        "PARAM_USE_MOUSEOVER" : PARAM_USE_MOUSEOVER,
        "PARAM_SHOW_TOOLTIPS" : PARAM_SHOW_TOOLTIPS,

        // Menu "Force Layout"
        "PARAM_GRAVITY_X" : PARAM_GRAVITY_X,
        "PARAM_GRAVITY_Y" : PARAM_GRAVITY_Y,
        "PARAM_REPULSION_STRENGTH" : PARAM_REPULSION_STRENGTH,
        "PARAM_LINK_STRENGTH" : PARAM_LINK_STRENGTH,
        "PARAM_SF_STRENGTH" : PARAM_SF_STRENGTH,
        "PARAM_FRICTION" : PARAM_FRICTION,

        // Menu "Graph Appearance"
        "PARAM_SHOW_GRAPH" : PARAM_SHOW_GRAPH,
        "PARAM_SHOW_LIFELINES" : PARAM_SHOW_LIFELINES,
        "PARAM_SHOW_LINKS" : PARAM_SHOW_LINKS,
        "PARAM_SHOW_NAMES" : PARAM_SHOW_NAMES,
        "PARAM_LINK_WIDTH" : PARAM_LINK_WIDTH,
        "PARAM_NODE_RADIUS" : PARAM_NODE_RADIUS,
        "PARAM_PERSON_LABEL_OPACITY" : PARAM_PERSON_LABEL_OPACITY,

        // Menu "Map Appearance"
        "PARAM_SHOW_CONTOURS" : PARAM_SHOW_CONTOURS,
        "PARAM_REVERSE_COLORMAP" : PARAM_REVERSE_COLORMAP,
        "PARAM_INTERPOLATE_NN" : PARAM_INTERPOLATE_NN,
        "PARAM_EMBED_LINKS" : PARAM_EMBED_LINKS,
        "PARAM_SHOW_TUNNELS" : PARAM_SHOW_TUNNELS,
        "PARAM_SHADING" : PARAM_SHADING,

        "PARAM_SCALARFIELD_DILATION_ITERS" : PARAM_SCALARFIELD_DILATION_ITERS,
        "PARAM_RANGE_MIN" : PARAM_RANGE_MIN,
        "PARAM_RANGE_MAX" : PARAM_RANGE_MAX,
        "PARAM_CONTOUR_STEP" : PARAM_CONTOUR_STEP,
        "PARAM_CONTOUR_BIG_STEP" : PARAM_CONTOUR_BIG_STEP,
        "PARAM_INDICATOR_FONTSIZE" : PARAM_INDICATOR_FONTSIZE,
        "PARAM_HEIGHT_SCALE" : PARAM_HEIGHT_SCALE,
        "PARAM_SCALARFIELD_RESOLUTION" : PARAM_SCALARFIELD_RESOLUTION,
        "PARAM_LINK_SAMPLE_STEPSIZE" : PARAM_LINK_SAMPLE_STEPSIZE,
        "PARAM_UNDERGROUND_THRESHOLD" : PARAM_UNDERGROUND_THRESHOLD,

        // other
        // "PARAM_FILENAME" : PARAM_FILENAME,
        "PARAM_SOURCE_FILE" : PARAM_SOURCE_FILE
    }

    return params;
}


// Input: object with key/value pairs, e.g.
// { "PARAM_1" : true, "Param_2" : 42, ...}
function setParameters(params)
{
    for (const [key, value] of Object.entries(params))
    {
        switch (key)
        {
            // Menu "Interaction"
            case "PARAM_ENERGIZE":
                PARAM_ENERGIZE = value;
                break;
            case "PARAM_USE_MOUSEOVER":
                PARAM_USE_MOUSEOVER = false; // deactivate interactive features by default
                break;
            case "PARAM_SHOW_TOOLTIPS":
                PARAM_SHOW_TOOLTIPS = value;
                break;

            // Menu "Force Layout"
            case "PARAM_GRAVITY_X":
                PARAM_GRAVITY_X = value;
                break;
            case "PARAM_GRAVITY_Y":
                PARAM_GRAVITY_Y = value;
                break;
            case "PARAM_REPULSION_STRENGTH":
                PARAM_REPULSION_STRENGTH = value;
                break;
            case "PARAM_LINK_STRENGTH":
                PARAM_LINK_STRENGTH = value;
                break;
            case "PARAM_SF_STRENGTH":
                PARAM_SF_STRENGTH = value;
                break;
            case "PARAM_FRICTION":
                PARAM_FRICTION = value;
                break;

            // Menu "Graph Appearance"
            case "PARAM_SHOW_GRAPH":
                PARAM_SHOW_GRAPH = true; // always show graph on default
                break;
            case "PARAM_SHOW_LIFELINES":
                PARAM_SHOW_LIFELINES = value;
                break;
            case "PARAM_SHOW_LINKS":
                PARAM_SHOW_LINKS = value;
                break;
            case "PARAM_SHOW_NAMES":
                PARAM_SHOW_NAMES = value;
                break;
            case "PARAM_LINK_WIDTH":
                PARAM_LINK_WIDTH = value;
                break;
            case "PARAM_NODE_RADIUS":
                PARAM_NODE_RADIUS = value;
                break;
            case "PARAM_PERSON_LABEL_OPACITY":
                PARAM_PERSON_LABEL_OPACITY = value;
                break;

            // Menu "Map Appearance"
            case "PARAM_SHOW_CONTOURS":
                PARAM_SHOW_CONTOURS = value;
                break;
            case "PARAM_REVERSE_COLORMAP":
                PARAM_REVERSE_COLORMAP = value;
                break;
            case "PARAM_INTERPOLATE_NN":
                PARAM_INTERPOLATE_NN = value;
                break;
            case "PARAM_EMBED_LINKS":
                PARAM_EMBED_LINKS = value;
                break;
            case "PARAM_SHOW_TUNNELS":
                PARAM_SHOW_TUNNELS = value;
                break;
            case "PARAM_SHADING":
                PARAM_SHADING = value;
                break;

            case "PARAM_SCALARFIELD_DILATION_ITERS":
                PARAM_SCALARFIELD_DILATION_ITERS = value;
                break;
            case "PARAM_RANGE_MIN":
                PARAM_RANGE_MIN = value; // will be overwritten by createForceGraph()
                break;
            case "PARAM_RANGE_MAX":
                PARAM_RANGE_MAX = value; // will be overwritten by createForceGraph()
                break;
            case "PARAM_CONTOUR_STEP":
                PARAM_CONTOUR_STEP = value;
                break;
            case "PARAM_CONTOUR_BIG_STEP":
                PARAM_CONTOUR_BIG_STEP = value;
                break;
            case "PARAM_INDICATOR_FONTSIZE":
                PARAM_INDICATOR_FONTSIZE = value;
                break;
            case "PARAM_HEIGHT_SCALE":
                PARAM_HEIGHT_SCALE = value;
                break;
            case "PARAM_SCALARFIELD_RESOLUTION":
                PARAM_SCALARFIELD_RESOLUTION = value;
                break;
            case "PARAM_LINK_SAMPLE_STEPSIZE":
                PARAM_LINK_SAMPLE_STEPSIZE = value;
                break;
            case "PARAM_UNDERGROUND_THRESHOLD":
                PARAM_UNDERGROUND_THRESHOLD = value;
                break;

            // other
            case "PARAM_SOURCE_FILE":
                PARAM_SOURCE_FILE = value;
                break;

            default:
                console.log("Unknown parameter", key, ":", value);
        }
    }

    initMenubar(); // update visuals based on parameter values
}


// This does *not* trigger any updates of the TAM,
// only the parameter menu is updated.
function setDefaultParameters()
{
    const isTFMRenderer = renderer instanceof TFMRenderer;
    console.log("Loading default parameters for",
        isTFMRenderer ? "TFMRenderer." : "TAMRenderer.");

    // Menu "Interaction"
    PARAM_ENERGIZE = true;
    PARAM_USE_MOUSEOVER = false;
    PARAM_SHOW_TOOLTIPS = true;

    // Menu "Force Layout"
    PARAM_GRAVITY_X = isTFMRenderer ? 0.07 : 0.06;
    PARAM_GRAVITY_Y = isTFMRenderer ? 0.07 : 0.06;
    PARAM_REPULSION_STRENGTH = 400;
    PARAM_LINK_STRENGTH = isTFMRenderer ? 1.8 : 0.8;
    PARAM_SF_STRENGTH = 0;
    PARAM_FRICTION = isTFMRenderer ? 0.2 : 0.4;

    // Menu "Graph Appearance"
    PARAM_SHOW_GRAPH = true;
    PARAM_SHOW_LIFELINES = false;
    PARAM_SHOW_LINKS = true;
    PARAM_SHOW_NAMES = true;
    PARAM_LINK_WIDTH = 2;
    PARAM_NODE_RADIUS = 10;
    PARAM_PERSON_LABEL_OPACITY = 0.7;

    // Menu "Map Appearance"
    PARAM_SHOW_CONTOURS = true;
    PARAM_REVERSE_COLORMAP = false;
    PARAM_INTERPOLATE_NN = false;
    PARAM_EMBED_LINKS = true;
    PARAM_SHOW_TUNNELS = true;
    PARAM_SHADING = true;

    PARAM_SCALARFIELD_DILATION_ITERS = 2;
    PARAM_RANGE_MIN = 0;
    PARAM_RANGE_MAX = 10;
    PARAM_CONTOUR_STEP = 10;
    PARAM_CONTOUR_BIG_STEP = 100;
    PARAM_INDICATOR_FONTSIZE = 15;
    PARAM_HEIGHT_SCALE = 50;
    PARAM_SCALARFIELD_RESOLUTION = 400;
    PARAM_LINK_SAMPLE_STEPSIZE = 2;
    PARAM_UNDERGROUND_THRESHOLD = 10;

    // Without menu entry
    PARAM_ARROW_RADIUS = isTFMRenderer ? 10 : 14;

    initMenubar(); // update visuals based on parameter values
}


function getMetadata()
{
    let metadata =
    {
        "exportedBy" : TAM_DESCRIPTION,
        "version" : d3.select("#version").text()
    }

    return metadata;
}
