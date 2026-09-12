const { connectLambda, getStore } = require("@netlify/blobs");

exports.handler = async function(event) {

    try {

        connectLambda(event);

        const store = getStore("ticketera-archivos");

        if (event.httpMethod === "POST") {

            const datos = JSON.parse(event.body || "{}");

            if (!datos.data || !datos.contentType) {

                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        ok: false,
                        error: "Faltan los datos del archivo."
                    })
                };
            }

            const clave =
                (datos.tipo || "archivo") +
                "/" +
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 10);

            const archivo = Buffer.from(
                datos.data,
                "base64"
            );

            await store.set(
                clave,
                archivo,
                {
                    metadata: {
                        contentType: datos.contentType,
                        nombreOriginal: datos.nombreOriginal || ""
                    }
                }
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    ok: true,
                    clave: clave
                })
            };
        }

        if (event.httpMethod === "GET") {

            const clave =
                event.queryStringParameters &&
                event.queryStringParameters.clave;

            if (!clave) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        ok: false,
                        error: "Falta la clave del archivo."
                    })
                };
            }

            const resultado = await store.getWithMetadata(
                clave,
                { type: "arrayBuffer" }
            );

            if (!resultado || !resultado.data) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        ok: false,
                        error: "Archivo no encontrado."
                    })
                };
            }

            const contentType =
                (resultado.metadata && resultado.metadata.contentType) ||
                "application/octet-stream";

            const buffer = Buffer.from(resultado.data);

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=31536000, immutable"
                },
                body: buffer.toString("base64"),
                isBase64Encoded: true
            };
        }

        return {
            statusCode: 405,
            body: JSON.stringify({
                ok: false,
                error: "Método no permitido."
            })
        };

    } catch (error) {

        console.error("Error en Ticketera:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: error.message,
                tipo: error.name
            })
        };
    }
};
