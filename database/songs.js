const { get, all, run, db } = require("./db");


/**
 * Obtiene todas las canciones que ya han sido utilizadas.
 */
async function getPlayedSongs() {
    return all(
        "SELECT song_file FROM daily_song_history ORDER BY played_date ASC"
    );
}


/**
 * Guarda una canción como utilizada en una fecha determinada.
 */
async function addPlayedSong(songFile, date) {
    await run(
        `
        INSERT INTO daily_song_history (song_file, played_date)
        VALUES (?, ?)
        ON CONFLICT (played_date) DO NOTHING
        `,
        songFile,
        date
    );
}


/**
 * Elimina todo el historial de canciones.
 * Se utiliza cuando se han utilizado todas las canciones
 * y comienza un nuevo ciclo.
 */
async function clearPlayedSongs() {
    await run("DELETE FROM daily_song_history");
}


/**
 * Obtiene la canción correspondiente al día.
 *
 * - Si ya existe una canción asignada para hoy,
 *   devuelve esa misma canción.
 *
 * - Si todavía no existe:
 *   - Busca las canciones que todavía no han salido.
 *   - Elige una aleatoriamente.
 *   - La guarda en la base de datos.
 *
 * - Si ya han salido todas:
 *   - Borra el historial.
 *   - Comienza un nuevo ciclo.
 */
async function getSongForDate(date, songs) {

    // Comprobar si ya hay una canción asignada para hoy.
    const existing = await get(
        "SELECT song_file FROM daily_song_history WHERE played_date = ?",
        date
    );

    if (existing) {
        const song = songs.find(
            song => song.file === existing.song_file
        );

        return song || null;
    }


    // Obtener canciones que ya han sido utilizadas.
    const playedRows = await getPlayedSongs();

    const playedSongs = new Set(
        playedRows.map(row => row.song_file)
    );


    // Filtrar únicamente las canciones que todavía no han salido.
    let availableSongs = songs.filter(
        song => !playedSongs.has(song.file)
    );


    // Si ya se han utilizado todas, empezar un nuevo ciclo.
    if (availableSongs.length === 0) {

        await clearPlayedSongs();

        availableSongs = [...songs];
    }


    // Elegir una canción aleatoria.
    const randomIndex = Math.floor(
        Math.random() * availableSongs.length
    );

    const selectedSong = availableSongs[randomIndex];


    // Guardarla como canción del día.
    await addPlayedSong(
        selectedSong.file,
        date
    );


    return selectedSong;
}


module.exports = {
    getPlayedSongs,
    addPlayedSong,
    clearPlayedSongs,
    getSongForDate
};