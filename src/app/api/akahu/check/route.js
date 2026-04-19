import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const appToken = process.env.AKAHU_APP_TOKEN;
        const userToken = process.env.AKAHU_USER_TOKEN;

        if (!appToken || !userToken) {
            return NextResponse.json(
                { error: "Akahu tokens missing from .env.local" },
                { status: 500 }
            );
        }

        // Securely fetch recent transactions from your connected bank accounts
        const response = await fetch('https://api.akahu.io/v1/transactions', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'X-Akahu-Id': appToken,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to connect to Akahu", details: data },
                { status: response.status }
            );
        }

        //   THE FIX: Filter out any outgoing money (withdrawals/purchases) first!
        const incomingDeposits = data.items.filter(tx => tx.amount > 0);

        // Return a clean summary of the 5 most recent INCOMING deposits
        const recentTransactions = incomingDeposits.slice(0, 5).map(tx => ({
            date: tx.date,
            amount: tx.amount,
            type: tx.type,
            description: tx.description,
            reference: tx.meta?.reference || "No reference"
        }));

        return NextResponse.json({
            success: true,
            message: "Successfully connected to your bank!",
            recent_transactions: recentTransactions
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}