import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export function LearningLab() {
    const [count, setCount] = useState(0);
    const [events, setEvents] = useState([]);
    useEffect(() => {
        supabase.from('events').select('*')
            .then(({ data }) => {
                setEvents(data || []);
            });

    }, []);

    return (
        <div style={{ padding: '40px' }}>
            <h1>Hello Jacob! This is my first line of code.</h1>

            <p>I have {count} coins in my piggy bank</p>

            <p>I have successfully pulled {events.length} events!</p>

            <button onClick={() => setCount(count + 1)}> Click to Add Coint Here: </button>

            <ul>
                {events.map((ev: any) => (
                    <li key={ev.id}>
                        <strong>{ev.title}</strong>
                    </li>
                ))}
            </ul>
        </div>


    );
}