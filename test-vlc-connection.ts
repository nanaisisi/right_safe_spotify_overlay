// VLC接続テスト用スクリプト
export {};

const config = {
    vlcHost: "127.0.0.1",
    vlcPort: 8080,
    vlcPassword: "higurago"
};

function createBasicAuth(password: string): string {
    return btoa(`:${password}`);
}

console.log("VLC Connection Test");
console.log("==================");
console.log(`Host: ${config.vlcHost}`);
console.log(`Port: ${config.vlcPort}`);
console.log(`Password: ${config.vlcPassword ? '[SET]' : '[NOT SET]'}`);
console.log();

try {
    const auth = createBasicAuth(config.vlcPassword);
    const vlcUrl = `http://${config.vlcHost}:${config.vlcPort}/requests/status.json`;
    
    console.log(`Testing connection to: ${vlcUrl}`);
    console.log(`Authorization header: Basic ${auth}`);
    console.log();
    
    const res = await fetch(vlcUrl, {
        headers: {
            "Authorization": `Basic ${auth}`,
        },
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    
    if (res.ok) {
        console.log("✓ VLC connection successful!");
        const data = await res.json();
        console.log(`State: ${data.state || 'unknown'}`);
        if (data.information?.category?.meta) {
            const meta = data.information.category.meta;
            console.log(`Title: ${meta.title || 'Not available'}`);
            console.log(`Artist: ${meta.artist || 'Not available'}`);
        }
    } else {
        console.log("✗ VLC connection failed!");
        const errorText = await res.text();
        console.log(`Error: ${errorText}`);
        
        if (res.status === 401) {
            console.log();
            console.log("TROUBLESHOOTING for 401 Unauthorized:");
            console.log("1. Check if VLC Web Interface password is correctly set");
            console.log("2. VLC Settings: Interface > Main interfaces > Lua > Lua HTTP > Password");
            console.log("3. Make sure the password in config.toml matches VLC setting");
            console.log("4. Try restarting VLC after changing the password");
        } else if (res.status === 404) {
            console.log();
            console.log("TROUBLESHOOTING for 404 Not Found:");
            console.log("1. Make sure VLC Web Interface is enabled");
            console.log("2. Check 'Web' in Interface > Main interfaces");
            console.log("3. Restart VLC completely");
        }
    }

} catch (error) {
    console.log("✗ Connection Error:");
    console.log(error.message);
    console.log();
    console.log("TROUBLESHOOTING:");
    console.log("1. Make sure VLC is running");
    console.log("2. Check if VLC HTTP interface is enabled on port 8080");
    console.log("3. Try accessing http://127.0.0.1:8080 in your browser");
}
