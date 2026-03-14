import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { origin, destination } = await request.json();

        // Securely pull your API key from the .env file
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Google Maps API key is missing" }, { status: 500 });
        }

        // Call the official Google Maps Distance Matrix API
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        // Check if Google successfully found the route
        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
            const durationInSeconds = data.rows[0].elements[0].duration.value;
            // Convert seconds to minutes and round up
            const durationInMinutes = Math.ceil(durationInSeconds / 60);

            return NextResponse.json({ minutes: durationInMinutes });
        } else {
            return NextResponse.json({ error: "Could not calculate distance. Address might be invalid." }, { status: 400 });
        }
    } catch (error) {
        console.error("Distance Matrix Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}