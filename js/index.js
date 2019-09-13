
async function getDownloadLinks() {
    const osName = navigator.appVersion;
    if (!osName) return;
    const response = await
        fetch("https://api.github.com/repos/Phxstick/Acnicoy/releases/latest");
    const data = await response.json();

    // Find the right asset (or just keep link to download page if none fits)
    let asset;
    if (osName.includes("Linux")) {
        if (osName.includes("Ubuntu")) {
            asset = data.assets.filter(a => a.name.endsWith("deb"))[0];
        } else {
            asset = data.assets.filter(a => a.name.endsWith("AppImage"))[0];
        }
    } else if (osName.includes("Win")) {
        asset = data.assets.filter(a => a.name.includes("win"))[0];
    } else {
        $("download-page-link").style.display = "none";
        return;
    }

    // Gather asset details
    const size = Math.floor(asset.size / (1024 * 1024));
    const arch = asset.name.includes("64") ? "64" : "32";
    let downloadType = "portable";
    if (asset.name.endsWith("deb") || asset.name.includes("setup")) {
        downloadType = "installer";
    }
    let filetype = asset.name.slice(asset.name.lastIndexOf(".") + 1);
    if (asset.name.endsWith("zip")) filetype = "zip";
    else if (asset.name.endsWith("tar.gz")) filetype = "tar.gz";
    else if (asset.name.endsWith("deb")) filetype = "deb";
    else if (asset.name.endsWith("AppImage")) filetype = "AppImage";

    // Adjust download button and text below
    $("download-button").href = asset.browser_download_url;
    if (osName.includes("Ubuntu"))
        $("download-button").textContent = "Download for Ubuntu";
    else if (osName.includes("Win"))
        $("download-button").textContent = "Download for Windows";
    else if (osName.includes("Linux"))
        $("download-button").textContent = "Download for Linux";
    $("download-details").textContent =
        `${arch} bit, ${downloadType}, ${filetype}, ${size} MB` ;
}

getDownloadLinks();
