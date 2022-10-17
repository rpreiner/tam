///////////////////////////////////////////////////////////////////////////////
//
// File open functionality added by Idefix2020 
//
///////////////////////////////////////////////////////////////////////////////

let tfmNodePositions = null;
let tfmLifelinePositions = null;


function resetSVGLayers()
{
    d3.select("#topolayer").remove();
    d3.select("#shadinglayer").remove();
    d3.select("#graphlayer").remove();
}

// Wrapper by rp
function onChangeFile(event)
{
    // show filename in HTML edit field
    var fileinput = document.getElementById("browse");
    var textinput = document.getElementById("filename");
    textinput.value = fileinput.files[0].name;

    // read file
    var file = event.target.files[0];
    if (!file)
        return;
    var reader = new FileReader();
    reader.onload = function (e) 
    {
        // stop current simulations and reset SVG layers
        if (renderer.FORCE_SIMULATION) 
            renderer.FORCE_SIMULATION.stop();
        resetSVGLayers();

        // load file
        var url = e.target.result;
        loadGraphFromUrl(url, file.name);
    };
    reader.readAsDataURL(file);
}

///////////////////////////////////////////////////////////////////////////////


// load data, choose renderer based on the filetype and create force graph
function loadGraphFromUrl(url, filename)
{
    PARAM_FILENAME = filename;
    PARAM_SOURCE_FILE = filename;

    // loading a .jsom or .tam file -> create standard TAM
    if (filename.endsWith(".json") || filename.endsWith(".tam"))
    {
        renderer = new TAMRenderer();
        d3.json(url).then(function(json) { processJSON(json, filename); });
    }
    //-- loading a GEDCOM file -> create TFM
    else if (filename.endsWith(".ged"))
    {
        renderer = new TFMRenderer();
        setDefaultParameters();
        loadGedcom(url, function(gedcom) {
            estimateMissingDates(gedcom, PARAM_PROCREATION_AGE);
            renderer.createFamilyForceGraph(gedcom);
        });
    }
    //-- loading a stored TFM
    else if (filename.endsWith(".tfm"))
    {
        renderer = new TFMRenderer();
        d3.json(url).then(function(json) { processTFM(json); });
    }
    else
        console.error("Unrecognized file type");
}


// Process JSON loaded from a .json or .tam,
// then create graph.
function processJSON(json, filename)
{
    if ("parameters" in json) {
        console.log("Loading parameters from file.");
        setParameters(json.parameters);
    }
    else {
        console.log("File does not contain parameters.");
        setDefaultParameters();
    }
    renderer.createForceGraphJSON(json);
}


// Process JSON loaded from a .tfm, load linked .ged or
// ask user to upload .ged, then create graph.
function processTFM(json)
{
    // first try to load parameters from .tfm
    if ("parameters" in json) {
        console.log("Loading parameters from file.");
        setParameters(json.parameters);
    }
    else {
        console.log("File does not contain parameters.");
        setDefaultParameters();
    }
    
    // Read node and lifeline positions, stash them globally for later use in case of missing GEDCOM file
    tfmNodePositions = ("nodePositions" in json) ? json.nodePositions : null;
    tfmLifelinePositions = ("lifelinePositions" in json) ? json.lifelinePositions : null;
    
    let sourcePath = folder + "/" + PARAM_SOURCE_FILE; // PARAM_SOURCE_FILE is set by setParameters()
    if (!checkFileExistence(sourcePath))
    {
        console.error("Couldn't find GEDCOM file", sourcePath);
        showModal(PARAM_SOURCE_FILE);   // Open modal to ask user for the missing file
    }
    else
    {
        // load the data file .ged
        loadGedcom(sourcePath, function (gedcom) {
            estimateMissingDates(gedcom, PARAM_PROCREATION_AGE);
            renderer.createFamilyForceGraph(gedcom, tfmNodePositions, tfmLifelinePositions);    // use stashed positions if available
        });
    }
}


function checkFileExistence(url)
{
    try {
        console.log("Trying to load", url);

        let req = new XMLHttpRequest();
        req.open("HEAD", url, false);
        req.send();

        return req.status != 404;
    } catch (error) {
        return false;
    }
}


function closeModal()
{
    document.querySelector("#overlay").style.display = "none";
}


function showModal(missingFileName) {
    if (missingFileName)
        document.querySelector("#missing-ged-file-name").textContent = missingFileName;
    else
        document.querySelector("#missing-ged-file-name").textContent = "unknown";

    document.querySelector("#overlay").style.display = "";
}


// Loads the GEDCOM file and creates the graph
function processModalFileUpload()
{
    let file = document.querySelector('#modal-file-upload').files[0];
    if (file) {
        closeModal();

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            loadGedcom(reader.result, function (gedcom) {
                estimateMissingDates(gedcom, PARAM_PROCREATION_AGE);
                PARAM_SOURCE_FILE = file.name;

                // use previously stored node positions (if available)
                renderer.createFamilyForceGraph(gedcom, tfmNodePositions, tfmLifelinePositions);
            });
        }
    }
}
