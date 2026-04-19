import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        console.log("📍 /api/distance Received:", body);

        // 1. Forgiving Inputs: Accept either 'destination' OR 'address'
        const destinationRaw = body.destination || body.address;

        // 2. Default Origin: If frontend forgets origin, use your home base
        const originRaw = body.origin || "9 Benbow Street, St Heliers, Auckland, New Zealand";

        if (!destinationRaw) {
            return NextResponse.json({ error: "Missing destination address" }, { status: 400 });
        }

        // 3. Address Helper: Auto-append Auckland if they just typed "59 baddeley ave"
        const destination = destinationRaw.toLowerCase().includes("auckland")
            ? destinationRaw
            : `${destinationRaw}, Auckland, New Zealand`;

        const origin = originRaw.toLowerCase().includes("auckland")
            ? originRaw
            : `${originRaw}, Auckland, New Zealand`;

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.error("❌ Google Maps API key is missing from .env");
            return NextResponse.json({ error: "Google Maps API key is missing" }, { status: 500 });
        }

        // 4. Force driving mode
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        // 5. Loud Diagnostics for your server terminal
        console.log(`🗺️ Routing: ${origin} ---> ${destination}`);
        console.log(`🗺️ Google API Status:`, data.status);

        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
            const durationInSeconds = data.rows[0].elements[0].duration.value;
            const durationInMinutes = Math.ceil(durationInSeconds / 60);

            console.log(`✅ Success! Drive time: ${durationInMinutes} mins`);
            return NextResponse.json({ minutes: durationInMinutes });
        } else {
            console.error("❌ Google Maps Element Status:", data.rows?.[0]?.elements?.[0]?.status);
            return NextResponse.json({ error: "Could not calculate distance. Address might be invalid." }, { status: 400 });
        }
    } catch (error) {
        console.error("🔥 Distance Matrix Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}