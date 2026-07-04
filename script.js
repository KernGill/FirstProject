const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =====================
// GAME STATE
// =====================

let gameState = "menu";

// =====================
// SCORE / DIFFICULTY
// =====================

let score = 0;
let startTime = 0;

let enemySpawnRate = 1000;
let enemySpeedMultiplier = 1;

// =====================
// DASH
// =====================

let dashCooldown = 0;
const dashCooldownTime = 1000;
const dashDistance = 180;

// =====================
// PLAYER
// =====================

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 5,
    color: "lime"
};

// =====================
// ENTITIES
// =====================

let enemies = [];
let projectiles = [];
let particles = [];

let screenShake = 0;

let lastSpawn = 0;
let lastRangedSpawn = 0;
const rangedSpawnInterval = 8000;

// =====================
// BUTTONS
// =====================

const startButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    width: 200,
    height: 70
};

const homeButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 + 100,
    width: 200,
    height: 70
};

// =====================
// INPUT
// =====================

const keys = {};

window.addEventListener("keydown", (e) => {

    keys[e.key] = true;

    if (
        e.code === "Space" &&
        dashCooldown <= 0 &&
        gameState === "playing"
    ) {

        let dx = 0;
        let dy = 0;

        if (keys["w"]) dy = -1;
        if (keys["s"]) dy = 1;
        if (keys["a"]) dx = -1;
        if (keys["d"]) dx = 1;

        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {

            dx /= len;
            dy /= len;

            player.x += dx * dashDistance;
            player.y += dy * dashDistance;

            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: player.x,
                    y: player.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    size: Math.random() * 6 + 2,
                    life: 30,
                    color: "cyan"
                });
            }

            dashCooldown = dashCooldownTime;
        }
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// =====================
// CLICK INPUT
// =====================

canvas.addEventListener("click", (e) => {

    const rect = canvas.getBoundingClientRect();

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (gameState === "menu") {
        if (
            mx > startButton.x &&
            mx < startButton.x + startButton.width &&
            my > startButton.y &&
            my < startButton.y + startButton.height
        ) {
            startGame();
        }
    }

    if (gameState === "gameover") {
        if (
            mx > homeButton.x &&
            mx < homeButton.x + homeButton.width &&
            my > homeButton.y &&
            my < homeButton.y + homeButton.height
        ) {
            resetGame();
        }
    }
});

// =====================
// START / RESET
// =====================

function startGame() {
    gameState = "playing";
    startTime = Date.now();
    enemies = [];
    projectiles = [];
    particles = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

function resetGame() {
    gameState = "menu";
    enemies = [];
    projectiles = [];
    particles = [];
    score = 0;
}

// =====================
// SPAWN ENEMY
// =====================

function spawnEnemy(type = "melee") {

    const size = 40;

    let x, y;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -size;
    } else if (side === 1) {
        x = Math.random() * canvas.width;
        y = canvas.height + size;
    } else if (side === 2) {
        x = -size;
        y = Math.random() * canvas.height;
    } else {
        x = canvas.width + size;
        y = Math.random() * canvas.height;
    }

    if (type === "ranged") {

        const fireRate = Math.floor(Math.random() * 4) + 1;

        enemies.push({
            x,
            y,
            size,
            type: "ranged",
            color: "purple",
            speed: player.speed * 0.1,
            fireRate: fireRate * 1000,
            lastShot: Date.now(),
            projectileSpeedMultiplier:
                fireRate === 1 ? 1 :
                fireRate === 2 ? 1.5 :
                fireRate === 3 ? 2 : 3
        });

    } else {

        enemies.push({
            x,
            y,
            size,
            type: "melee",
            color: "red",
            speed: 2 * enemySpeedMultiplier
        });
    }
}

// =====================
// UPDATE
// =====================

function update() {

    if (gameState !== "playing") return;

    const now = Date.now();

    score = ((now - startTime) / 1000).toFixed(1);

    const survivalTime = (now - startTime) / 1000;

    enemySpawnRate = Math.max(250, 1000 - survivalTime * 20);
    enemySpeedMultiplier = 1 + survivalTime * 0.02;

    if (now - lastSpawn > enemySpawnRate) {
        spawnEnemy("melee");
        lastSpawn = now;
    }

    if (now - lastRangedSpawn > rangedSpawnInterval) {
        spawnEnemy("ranged");
        lastRangedSpawn = now;
    }

    if (dashCooldown > 0) dashCooldown -= 16;

    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;

    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

    const safeDist = (dx, dy) => {
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        return [dx / d, dy / d];
    };

    // =====================
    // ENEMIES
    // =====================

    enemies.forEach((e) => {

        const dx = player.x - e.x;
        const dy = player.y - e.y;

        const [vx, vy] = safeDist(dx, dy);

        e.x += vx * e.speed;
        e.y += vy * e.speed;

        if (e.type === "ranged") {

            if (now - e.lastShot > e.fireRate) {

                const projSpeed = player.speed * e.projectileSpeedMultiplier;

                projectiles.push({
                    x: e.x,
                    y: e.y,
                    vx: vx * projSpeed,
                    vy: vy * projSpeed,
                    size: 6,
                    color: "purple"
                });

                e.lastShot = now;
            }
        }

        if (
            player.x < e.x + e.size &&
            player.x + player.size > e.x &&
            player.y < e.y + e.size &&
            player.y + player.size > e.y
        ) {
            screenShake = 20;
            gameState = "gameover";
        }
    });

    // =====================
    // PROJECTILES
    // =====================

    projectiles.forEach((p, i) => {

        p.x += p.vx;
        p.y += p.vy;

        if (
            player.x < p.x + p.size &&
            player.x + player.size > p.x &&
            player.y < p.y + p.size &&
            player.y + player.size > p.y
        ) {
            screenShake = 20;
            gameState = "gameover";
        }

        if (
            p.x < -100 || p.x > canvas.width + 100 ||
            p.y < -100 || p.y > canvas.height + 100
        ) {
            projectiles.splice(i, 1);
        }
    });

    // =====================
    // PARTICLES
    // =====================

    particles.forEach((p, i) => {

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) particles.splice(i, 1);
    });
}

// =====================
// DRAW
// =====================

function drawGrid() {

    const size = 50;
    ctx.strokeStyle = "#1a1a1a";

    for (let x = 0; x < canvas.width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawGame() {

    // player
    ctx.fillStyle = "lime";
    ctx.fillRect(player.x, player.y, player.size, player.size);

    // enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.size, e.size);
    });

    // projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = "purple";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // UI
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Time: ${score}`, 20, 30);
}

function drawMenu() {

    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("SURVIVE THE ARENA", canvas.width / 2 - 200, 200);

    ctx.fillStyle = "lime";
    ctx.fillRect(startButton.x, startButton.y, startButton.width, startButton.height);

    ctx.fillStyle = "black";
    ctx.fillText("START", canvas.width / 2 - 65, startButton.y + 45);
}

function drawGameOver() {

    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 150, 200);

    ctx.fillStyle = "lime";
    ctx.fillRect(homeButton.x, homeButton.y, homeButton.width, homeButton.height);

    ctx.fillStyle = "black";
    ctx.fillText("HOME", canvas.width / 2 - 75, homeButton.y + 45);
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    ctx.save();

    if (screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );
        screenShake *= 0.9;
    }

    if (gameState === "menu") drawMenu();
    else if (gameState === "playing") drawGame();
    else if (gameState === "gameover") drawGameOver();

    ctx.restore();
}

// =====================
// LOOP
// =====================

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();