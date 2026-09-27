const http = require('http');
const { exec } = require('child_process');
const os = require('os');

const PORT = 3000;

function getCPUUsage() {
    return new Promise((resolve) => {
        const startMeasures = os.cpus().map(cpu => cpu.times);
        setTimeout(() => {
            const endMeasures = os.cpus().map(cpu => cpu.times);
            let totalDiff = 0;
            let idleDiff = 0;

            for (let i = 0; i < startMeasures.length; i++) {
                const start = startMeasures[i];
                const end = endMeasures[i];
                
                const startTotal = Object.values(start).reduce((a, b) => a + b, 0);
                const endTotal = Object.values(end).reduce((a, b) => a + b, 0);
                
                totalDiff += (endTotal - startTotal);
                idleDiff += (end.idle - start.idle);
            }

            const usage = totalDiff === 0 ? 0 : ((totalDiff - idleDiff) / totalDiff) * 100;
            resolve(parseFloat(usage.toFixed(1)));
        }, 1000);
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/api/stats') {
        const cpuPercentage = await getCPUUsage();

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramPercentage = parseFloat(((usedMem / totalMem) * 100).toFixed(1));

        // Use a standard df command string split regex pattern
        exec("df -P / | tail -n 1", (error, stdout) => {
            let diskPercentage = 0;

            if (!error && stdout) {
                const parts = stdout.trim().split(/\s+/);
                if (parts.length >= 5) {
                    // Pull out the percentage number directly from the use string (e.g. "45%")
                    diskPercentage = parseFloat(parts[4].replace('%', ''));
                }
            }

            // Expose values with strict object references
            res.writeHead(200);
            res.end(JSON.stringify({
                cpu: cpuPercentage,
                ram: ramPercentage,
                disk: diskPercentage
            }));
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Node stats server running on http://localhost:${PORT}`);
});
