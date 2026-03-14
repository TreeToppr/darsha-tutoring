'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function ManageTutors() {
    const [tutors, setTutors] = useState([]);

    useEffect(() => {
        supabase.from('profiles').select('*').eq('role', 'tutor').then(({ data }) => setTutors(data || []));
    }, []);

    return (
        <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Tutor Directory</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Add Tutor</button>
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Subjects</th>
                        <th className="p-4">Rates</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y text-sm">
                    {tutors.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">{t.full_name}</td>
                            <td className="p-4">{t.subjects?.join(', ')}</td>
                            <td className="p-4">
                                Yr 1-6: ${t.hourly_rates?.year_1_6} <br />
                                Yr 7-12: ${t.hourly_rates?.year_7_12}
                            </td>
                            <td className="p-4 space-x-2">
                                <button className="text-blue-600">Edit</button>
                                <button className="text-red-600">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}