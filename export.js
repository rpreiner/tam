///////////////////////////////////////////////////////////////////////////////
//
// Topographic Attribute Maps Demo
// Copyright 2021 Reinhold Preiner
//
// This code is licensed under an MIT License.
// See the accompanying LICENSE file for details.
//
///////////////////////////////////////////////////////////////////////////////


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

