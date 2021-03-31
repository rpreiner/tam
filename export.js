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
