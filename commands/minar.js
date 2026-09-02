const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const {
    getLocalDateString
} = require("../database/daily-game");

const {
    ensureUser,
    updateUserFields,
    getUserByDiscordId,
    getLevelFromXp
} = require("../database/users");

const MINERALS = [
    { id: "stone", name: "Piedra", plural: "Piedras", xp: 1, probability: 50.26, minAmount: 50, maxAmount: 125, rarity: "common", message: "⛏️ Has encontrado un montón de piedra." },
    { id: "coal", name: "Carbón", plural: "Carbones", xp: 2, probability: 20.0, minAmount: 40, maxAmount: 80, rarity: "common", message: "⛏️ Has encontrado carbón entre las rocas." },
    { id: "iron", name: "Hierro", plural: "Hierros", xp: 5, probability: 8.0, minAmount: 20, maxAmount: 60, rarity: "uncommon", message: "⛏️ ¡Has encontrado una veta de hierro!" },
    { id: "gold", name: "Oro", plural: "Oros", xp: 15, probability: 7.0, minAmount: 10, maxAmount: 30, rarity: "uncommon", message: "✨ ¡Has encontrado oro! Parece que hoy tienes suerte." },
    { id: "quartz", name: "Cuarzo", plural: "Cuarzos", xp: 25, probability: 4.5, minAmount: 10, maxAmount: 25, rarity: "rare", message: "✨ ¡Has encontrado un bonito cristal de cuarzo!" },
    { id: "emerald", name: "Esmeralda", plural: "Esmeraldas", xp: 50, probability: 3.5, minAmount: 6, maxAmount: 10, rarity: "rare", message: "💚 ¡Una esmeralda! Su intenso color destaca entre las rocas." },
    { id: "ruby", name: "Rubí", plural: "Rubíes", xp: 100, probability: 3.0, minAmount: 4, maxAmount: 7, rarity: "very_rare", message: "❤️ ¡HAS ENCONTRADO UN RUBÍ! Esto ya empieza a ponerse interesante." },
    { id: "diamond", name: "Diamante", plural: "Diamantes", xp: 300, probability: 1.2, minAmount: 1, maxAmount: 4, rarity: "legendary", message: "💎 ¡¡¡HAS ENCONTRADO UN DIAMANTE!!!" },
    { id: "obsidian", name: "Obsidiana", plural: "Obsidianas", xp: 500, probability: 0.8, minAmount: 1, maxAmount: 3, rarity: "legendary", message: "🖤 ¡Has encontrado una extraña pieza de obsidiana!" },

    { id: "blackopal", name: "Ópalo Negro", plural: "Ópalos Negros", xp: 750, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🌑 ¡¡¡HAS ENCONTRADO UN ÓPALO NEGRO!!! Su brillo es extraordinariamente raro." },
    { id: "criptonita", name: "Criptonita", plural: "Criptonitas", xp: 900, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "☢️ Una extraña roca verde emite una radiación que no parece natural... por alguna razón, sientes que deberías mantenerla lejos de cualquier hombre con capa." },
    { id: "nukacola", name: "Nuka-Cola", plural: "Nuka-Colas", xp: 1100, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🥤 Una botella con un líquido azul brillante. La etiqueta promete que te sentirás mejor... aunque el contador Geiger diga lo contrario." },
    { id: "luckyblock", name: "Lucky Block", plural: "Lucky Blocks", xp: 1300, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "?????????????????????????" },
    { id: "paraiba", name: "Turmalina Paraíba", plural: "Turmalinas Paraíba", xp: 1500, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🩵 ¡¡¡HAS ENCONTRADO UNA TURMALINA PARAÍBA!!! Una gema de un color increíblemente raro." },
    { id: "leavemealone", name: "Leave Me Alone", plural: "Leave Me Alone", xp: 1700, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🌲 Una pequeña nota aparece entre los árboles enterrados. Solo contiene tres palabras: «Leave Me Alone». No sabes quién la dejó... y prefieres no descubrirlo." },
    { id: "portalgun", name: "Portal Gun", plural: "Portal Guns", xp: 2000, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "🌀 Un extraño dispositivo con un aspecto bastante peligroso. Rick probablemente sabría cómo usarlo... tú solo esperas no abrir un portal hacia una dimensión hostil." },
    { id: "ancient", name: "Artefacto Antiguo", plural: "Artefactos Antiguos", xp: 2400, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🏺 ¡¡¡HAS ENCONTRADO UN ARTEFACTO ANTIGUO!!! Nadie sabe cuánto tiempo llevaba enterrado." },
    { id: "raygun", name: "Pistola de Rayos", plural: "Pistolas de Rayos", xp: 2700, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "🔫 Un arma de aspecto imposible que emite un leve zumbido. Si realmente dispara lo que crees que dispara... quizá deberías preocuparte más por lo que hay detrás de ti." },
    { id: "keyblade", name: "Llave Espada", plural: "Llaves Espada", xp: 3500, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "🔑 Una extraña llave con forma de espada. No parece abrir ninguna cerradura normal... pero algo te dice que hay puertas que solo ella puede abrir." },
    { id: "taaffeita", name: "Taaffeíta", plural: "Taaffeítas", xp: 4000, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "💜 ¡¡¡TAAFFEÍTA ENCONTRADA!!! Acabas de encontrar una de las gemas más raras y preciosas del mundo." },
    { id: "omnitrix", name: "Omnitrix", plural: "Omnitrix", xp: 4800, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "⌚ Un extraño dispositivo verde se ha adherido a tu muñeca. No sabes quién lo diseñó, pero definitivamente no parece un reloj corriente." },
    { id: "masterball", name: "Master Ball", plural: "Master Balls", xp: 6000, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🟣 Una Poké Ball de aspecto demasiado perfecto. Si realmente puede capturar a cualquier Pokémon... quizá haya una buena razón para que sea tan difícil de conseguir." },
    { id: "gomugomu", name: "Gomu Gomu no Mi", plural: "Gomu Gomu no Mi", xp: 6500, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "🍈 Una fruta de aspecto bastante peculiar. No parece especialmente apetecible... aunque algo te dice que sus efectos serían mucho más extraños que su sabor." },
    { id: "indunnapple", name: "Manzana de Idunn", plural: "Manzanas de Idunn", xp: 7000, probability: 0.06, rarity: "mythic", uniqueAmount: true, message: "🍎 Una manzana dorada de aspecto casi divino. Dicen que incluso los dioses necesitan de ella para conservar aquello que el tiempo intenta arrebatarles." },
    { id: "behelit", name: "Behelit", plural: "Behelits", xp: 8000, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "👁️ Un extraño rostro de piedra cuelga de una vieja cadena. Sus ojos parecen seguirte... aunque jurarías que hace un momento estaban cerrados." },
    { id: "sarten", name: "Sartén", plural: "Sartenes", xp: 9000, probability: 0.06, rarity: "mythic", uniqueAmount: true, message: "🍳 Una simple sartén... o eso parece. Está sorprendentemente bien conservada para haber sobrevivido a un campo de batalla." },
    { id: "painita", name: "Painita", plural: "Painitas", xp: 11000, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "🔥 ¡¡¡HAS ENCONTRADO PAINITA!!! Una de las gemas más raras que podrías encontrar." },
    { id: "puppet", name: "Marioneta", plural: "Marionetas", xp: 11000, probability: 0.06, rarity: "mythic", uniqueAmount: true, message: "🎭 Una vieja marioneta te observa desde las sombras. No recuerdas haberla visto moverse... pero tampoco recuerdas haberla dejado ahí." },
    { id: "holygrenade", name: "Granada Sagrada", plural: "Granadas Sagradas", xp: 14000, probability: 0.08, rarity: "mythic", uniqueAmount: true, message: "✨ Una granada envuelta en un resplandor celestial. Resulta difícil decidir si deberías lanzarla... o empezar a rezar." },
    { id: "jeremejevita", name: "Jeremejevita", plural: "Jeremejevitas", xp: 18000, probability: 0.06, rarity: "mythic", uniqueAmount: true, message: "🤍 ¡¡¡JEREMEJEVITA!!! Has encontrado una gema con forma de mitad de corazón. ¿Dónde estará su otra mitad?" },

    { id: "deathnote", name: "Death Note", plural: "Death Notes", xp: 22000, probability: 0.04, rarity: "artifact", uniqueAmount: true, message: "📓 Un cuaderno negro con un nombre escrito en la portada. Las instrucciones parecen absurdas... hasta que empiezas a leerlas." },
    { id: "dedosukuna", name: "Dedo de Sukuna", plural: "Dedos de Sukuna", xp: 30000, probability: 0.03, rarity: "artifact", uniqueAmount: true, message: "🖐️ Un dedo seco y ennegrecido desprende una energía maldita que te pone los pelos de punta. Definitivamente no parece algo que debas tocar." },
    { id: "musgravita", name: "Musgravita", plural: "Musgravitas", xp: 35000, probability: 0.07, rarity: "mythic", uniqueAmount: true, message: "🖤 ¡¡¡MUSGRAVITA!!! Has encontrado una gema con forma de mitad de corazón. ¿Quién tendrá su otra mitad?" },
    { id: "triforce", name: "Trifuerza", plural: "Trifuerzas", xp: 42000, probability: 0.02, rarity: "artifact", uniqueAmount: true, message: "🔺 Tres fragmentos dorados forman un símbolo perfecto. Su poder parece capaz de conceder cualquier deseo... siempre que seas digno de él." },
    { id: "dovahkiin", name: "Dovahkiin", plural: "Dovahkiins", xp: 50000, probability: 0.02, rarity: "artifact", uniqueAmount: true, message: "🐉 Un antiguo casco de hierro reposa entre las ruinas. Al acercarte, un extraño rugido parece resonar a lo lejos." },
    { id: "elpoder", name: "El Poder", plural: "El Poder", xp: 55000, probability: 0.01, rarity: "artifact", uniqueAmount: true, message: "⚡ Una extraña energía parece concentrarse en tus manos. No sabes exactamente qué puedes hacer con ella... pero solo se te ocurre enviar cosas a la luna." },
    { id: "galdrabok", name: "Galdrabók", plural: "Galdrabóks", xp: 70000, probability: 0.01, rarity: "artifact", uniqueAmount: true, message: "📕 ¡¡¡HAS ENCONTRADO EL GALDRABÓK!!! Un antiguo libro de magia rúnica. Esto no debería estar aquí..." }
];



MINERALS.sort((a, b) => b.probability - a.probability);

const totalProbability = MINERALS.reduce((total, mineral) => total + mineral.probability, 0);
if (Math.abs(totalProbability - 100) > 0.0001) {
    console.error(`⚠️ Las probabilidades de minería suman ${totalProbability}% en lugar de 100%.`);
}

const getStreakLuck = (streak) => Math.min(Math.max(Number(streak) || 0, 0), 50);

const getProgressCurve = (luck) => Math.pow(luck / 50, 2.2);

const RARITY_MULTIPLIER = {
    "common": 0.0003,
    "uncommon": 0.2,
    "rare": 1.5,
    "very_rare": 4,
    "legendary": 8,
    "mythic": 4,
    "artifact": 11
};

function getMineralMultiplier(mineral, streak) {
    const luck = getStreakLuck(streak);
    const progress = getProgressCurve(luck);
    const maxMultiplier = RARITY_MULTIPLIER[mineral.rarity] || 1;

    if (mineral.rarity === "common") {
        return 1 - (1 - maxMultiplier) * progress;
    }

    return 1 + (maxMultiplier - 1) * progress;
}

function getRandomMineral(streak) {
    const weightedMinerals = MINERALS.map(mineral => ({
        mineral,
        weight: mineral.probability * getMineralMultiplier(mineral, streak)
    }));

    const totalWeight = weightedMinerals.reduce((total, item) => total + item.weight, 0);
    let random = Math.random() * totalWeight;
    let accumulated = 0;

    for (const item of weightedMinerals) {
        accumulated += item.weight;
        if (random < accumulated) return item.mineral;
    }

    return MINERALS[0];
}

function getRandomAmount(mineral) {
    if (mineral.uniqueAmount) return 1;

    const random = Math.random();

    switch (mineral.id) {
        case "diamond":
            if (random < 0.70) return 1;
            if (random < 0.90) return 2;
            if (random < 0.98) return 3;
            return 4;
        case "obsidian":
            if (random < 0.70) return 1;
            if (random < 0.95) return 2;
            return 3;
        case "ruby":
            if (random < 0.60) return 4;
            if (random < 0.85) return 5;
            if (random < 0.95) return 6;
            return 7;
        default:
            return Math.floor(Math.random() * (mineral.maxAmount - mineral.minAmount + 1)) + mineral.minAmount;
    }
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName("minar")
        .setDescription("Mina una vez al día para conseguir minerales y objetos."),

    async execute(interaction) {
        let user;
        try {
            user = await ensureUser(interaction.user.id, interaction.user.tag);
        } catch (error) {
            console.error("Error obteniendo usuario para minería:", error);
            return interaction.reply({
                content: "❌ Ha ocurrido un error al cargar tu perfil.",
                ephemeral: true
            });
        }

        const today = getLocalDateString();
        const lastMiningDate = user.last_mining_date ? String(user.last_mining_date) : null;

        if (lastMiningDate === today) {
            return interaction.reply({
                content: "❌ **Ya has minado hoy.**\n\n⛏️ Vuelve mañana para volver a minar.",
                ephemeral: true
            });
        }

        const dailyStreak = Number(user.daily_streak || 0);
        const streakLuck = getStreakLuck(dailyStreak);
        const mineral = getRandomMineral(streakLuck);
        const amount = getRandomAmount(mineral);
        const xpGain = amount * mineral.xp;

        let currentUser;
        try {
            currentUser = await getUserByDiscordId(interaction.user.id);
        } catch (error) {
            console.error("Error obteniendo usuario para calcular XP:", error);
            return interaction.reply({
                content: "❌ Ha ocurrido un error al procesar la minería.",
                ephemeral: true
            });
        }

        const currentXp = Number(currentUser?.xp || 0);
        const totalXp = currentXp + xpGain;
        const nextLevel = getLevelFromXp(totalXp);

        const previousBest = currentUser?.most_valuable_mineral
            ? MINERALS.find(item => item.id === currentUser.most_valuable_mineral)
            : null;

        const isMoreValuable = !previousBest || mineral.xp > previousBest.xp;
        const mostValuableMineral = isMoreValuable ? mineral.id : currentUser?.most_valuable_mineral || null;

        const imagePath = path.join(__dirname, "../minerals", `${mineral.id}.png`);

        if (!fs.existsSync(imagePath)) {
            console.error(`No se encontró la imagen del objeto: ${imagePath}`);
            return interaction.reply({
                content: "❌ Ha ocurrido un error: no se encontró la imagen del objeto.",
                ephemeral: true
            });
        }

        try {
            await updateUserFields(
                interaction.user.id,
                {
                    xp: totalXp,
                    level: nextLevel,
                    last_mining_date: today,
                    most_valuable_mineral: mostValuableMineral
                },
                interaction.member
            );
        } catch (error) {
            console.error("Error guardando resultado de minería:", error);
            return interaction.reply({
                content: "❌ Ha ocurrido un error al guardar el resultado de la minería.",
                ephemeral: true
            });
        }

        const attachment = new AttachmentBuilder(imagePath, { name: `${mineral.id}.png` });
        const amountText = mineral.uniqueAmount
            ? `**${mineral.name}**`
            : `**${amount} ${amount !== 1 ? mineral.plural : mineral.name}**`;

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username} ha encontrado...`)
            .setDescription(`${mineral.message}\n\n${amountText}\n\n⭐ **+${xpGain} XP**`)
            .setThumbnail(`attachment://${mineral.id}.png`)
            .setFooter({ text: "⛏️ Puedes volver a minar mañana." });

        return interaction.reply({
            embeds: [embed],
            files: [attachment],
            ephemeral: false
        });
    }
};
