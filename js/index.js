
async function getDownloadLinks() {
    const response = await
        fetch("https://api.github.com/repos/Phxstick/Acnicoy/releases/latest");
    const data = await response.json();
    for (const asset of data.assets) {
        if (asset.name.endsWith("linux-x64.tar.gz")) {
            $("download-for-linux").href = asset.browser_download_url;
            $("download-size-linux").textContent =
                Math.floor(asset.size / (1024 * 1024));
            $("download-details-linux").style.display = "block";
        } else if (asset.name.endsWith("win-x64.zip")) {
            $("download-for-windows").href = asset.browser_download_url;
            $("download-size-windows").textContent =
                Math.floor(asset.size / (1024 * 1024));
            $("download-details-windows").style.display = "block";
        }
    }
}

getDownloadLinks();
