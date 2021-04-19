///////////////////////////////////////////////////////////////////////////////
//
// File open functionality added by Idefix2020 
//
///////////////////////////////////////////////////////////////////////////////

function resetSVGLayers()
{
    d3.select("#topolayer").remove();
    d3.select("#shadinglayer").remove();
    d3.select("#graphlayer").remove();
}

function readSingleFile(e)
{
    var file = e.target.files[0];
    if (!file)
        return;

    var reader = new FileReader();
    reader.onload = function (e) {
        var url = e.target.result;
        if (renderer.FORCE_SIMULATION) renderer.FORCE_SIMULATION.stop();
        resetSVGLayers();
        if (file.name.endsWith(".json") || file.name.endsWith(".tam")) {
            PARAM_FILENAME = file.name;
            renderer = new TAMRenderer();
            d3.json(url).then(function (json) {
                if ("parameters" in json) {
                    console.log("Loading parameters from file.");
                    setParameters(json.parameters);
                }
                else {
                    console.log("File does not contain parameters.");
                    setDefaultParameters();
                }
                renderer.createForceGraphJSON(json);
            });
        }
        else if (file.name.endsWith(".ged")) {
            PARAM_FILENAME = file.name;
            renderer = new TFMRenderer();
            setDefaultParameters();
            loadGedcom(url, function (gedcom) {
                estimateMissingDates(gedcom, PARAM_PROCREATION_AGE);
                renderer.createFamilyForceGraph(gedcom);
            });
        }
        else
            console.error("Unrecognized file type");
    };
    reader.readAsDataURL(file);
}


// Wrapper by rp
function onChangeFile(event)
{
    var fileinput = document.getElementById("browse");
    var textinput = document.getElementById("filename");
    textinput.value = fileinput.files[0].name;

    readSingleFile(event);
}
