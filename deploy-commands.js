require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const commandsPath =
    path.join(
        __dirname,
        "commands"
    );


const commandFiles =
    fs
        .readdirSync(commandsPath)
        .filter(
            file =>
                file.endsWith(".js")
        );


const commands = [];

const commandNames = new Map();


/*
 * ============================================================
 * CARGAR COMANDOS
 * ============================================================
 */

for (
    const file of commandFiles
) {

    const filePath =
        path.join(
            commandsPath,
            file
        );


    let command;


    /*
     * ========================================================
     * CARGAR ARCHIVO
     * ========================================================
     */

    try {

        command =
            require(
                filePath
            );

    } catch (error) {

        console.error(
            `❌ Error cargando ${file}:`
        );

        console.error(
            error
        );

        continue;

    }


    /*
     * ========================================================
     * COMPROBAR DATA
     * ========================================================
     */

    if (
        !command.data
    ) {

        console.warn(
            `⚠️ El comando ${file} no exporta "data" y será ignorado.`
        );

        continue;

    }


    /*
     * ========================================================
     * OBTENER NOMBRE
     * ========================================================
     */

    const commandData =
        command.data.toJSON();


    const commandName =
        commandData.name;


    /*
     * ========================================================
     * COMPROBAR NOMBRE
     * ========================================================
     */

    if (
        commandNames.has(
            commandName
        )
    ) {

        const previousFile =
            commandNames.get(
                commandName
            );


        console.error(
            ""
        );

        console.error(
            "❌ ================================================"
        );

        console.error(
            "❌ COMANDO DUPLICADO"
        );

        console.error(
            "❌ ================================================"
        );

        console.error(
            `❌ Nombre: /${commandName}`
        );

        console.error(
            `❌ Archivo 1: ${previousFile}`
        );

        console.error(
            `❌ Archivo 2: ${file}`
        );

        console.error(
            "❌ ================================================"
        );

        console.error(
            ""
        );


        continue;

    }


    /*
     * ========================================================
     * GUARDAR NOMBRE
     * ========================================================
 */

    commandNames.set(
        commandName,
        file
    );


    /*
     * ========================================================
     * AÑADIR COMANDO
     * ========================================================
 */

    commands.push(
        commandData
    );

}


/*
 * ============================================================
 * MOSTRAR COMANDOS
 * ============================================================
 */

console.log(
    `📦 Comandos encontrados: ${commands.length}`
);


console.log(
    "📋 Comandos:"
);


for (
    const command of commands
) {

    console.log(
        `   /${command.name}`
    );

}


/*
 * ============================================================
 * COMPROBAR VARIABLES DE ENTORNO
 * ============================================================
 */

if (
    !process.env.TOKEN
) {

    console.error(
        "❌ Falta TOKEN en el archivo .env."
    );

    process.exit(
        1
    );

}


if (
    !process.env.CLIENT_ID
) {

    console.error(
        "❌ Falta CLIENT_ID en el archivo .env."
    );

    process.exit(
        1
    );

}


if (
    !process.env.GUILD_ID
) {

    console.error(
        "❌ Falta GUILD_ID en el archivo .env."
    );

    process.exit(
        1
    );

}


/*
 * ============================================================
 * REGISTRAR COMANDOS
 * ============================================================
 */

const rest =
    new REST({
        version: "10"
    })
        .setToken(
            process.env.TOKEN
        );


(async () => {

    try {

        console.log(
            ""
        );

        console.log(
            "🔄 Registrando comandos en Discord..."
        );


        await rest.put(

            Routes.applicationGuildCommands(

                process.env.CLIENT_ID,

                process.env.GUILD_ID

            ),

            {
                body:
                    commands
            }

        );


        console.log(
            ""
        );

        console.log(
            `✅ ${commands.length} comandos registrados correctamente.`
        );

    } catch (error) {

        console.error(
            ""
        );

        console.error(
            "❌ Error registrando los comandos:"
        );

        console.error(
            error
        );

    }

})();