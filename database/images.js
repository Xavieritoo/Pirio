const { get, all, run } = require("./db");


/**
 * Obtiene todas las imágenes que ya han sido utilizadas.
 */
async function getPlayedImages() {
    return all(
        "SELECT image_file FROM daily_image_history ORDER BY played_date ASC"
    );
}


/**
 * Guarda una imagen como utilizada en una fecha determinada.
 */
async function addPlayedImage(imageFile, date) {
    await run(
        `
        INSERT INTO daily_image_history (image_file, played_date)
        VALUES (?, ?)
        ON CONFLICT (played_date) DO NOTHING
        `,
        imageFile,
        date
    );
}


/**
 * Elimina todo el historial de imágenes.
 *
 * Cuando todas las imágenes disponibles han salido,
 * se empieza un nuevo ciclo.
 */
async function clearPlayedImages() {
    await run("DELETE FROM daily_image_history");
}


/**
 * Obtiene la imagen correspondiente al día.
 *
 * Si ya existe una imagen para hoy:
 *   → devuelve esa misma imagen.
 *
 * Si no existe:
 *   → busca imágenes que todavía no hayan salido.
 *   → elige una aleatoriamente.
 *   → la guarda en la base de datos.
 *
 * Si ya han salido todas:
 *   → borra el historial.
 *   → empieza un nuevo ciclo.
 */
async function getImageForDate(date, images) {

    // Comprobar si ya existe una imagen para hoy.
    const existing = await get(
        "SELECT image_file FROM daily_image_history WHERE played_date = ?",
        date
    );

    if (existing) {
        const image = images.find(
            image => image.file === existing.image_file
        );

        return image || null;
    }


    // Obtener imágenes que ya han salido.
    const playedRows = await getPlayedImages();

    const playedImages = new Set(
        playedRows.map(row => row.image_file)
    );


    // Obtener únicamente las imágenes que todavía no han salido.
    let availableImages = images.filter(
        image => !playedImages.has(image.file)
    );


    // Si ya han salido todas, empezar un nuevo ciclo.
    if (availableImages.length === 0) {

        await clearPlayedImages();

        availableImages = [...images];
    }


    // Elegir una imagen aleatoriamente.
    const randomIndex = Math.floor(
        Math.random() * availableImages.length
    );

    const selectedImage = availableImages[randomIndex];


    // Guardar la imagen seleccionada como imagen del día.
    await addPlayedImage(
        selectedImage.file,
        date
    );


    return selectedImage;
}


module.exports = {
    getPlayedImages,
    addPlayedImage,
    clearPlayedImages,
    getImageForDate
};