export function ProfileInput({ label, value, onChange, disabled = false }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{label}</label>
            <input
                value={value || ''}
                onChange={e => onChange?.(e.target.value)}
                disabled={disabled}
                className="w-full border rounded-lg p-2.5 bg-gray-50 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
    );
}

export function RateInput({ label, value, onChange }) {
    return (
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
            <span className="text-sm font-medium flex-1">{label}</span>
            <div className="flex items-center">
                <span className="text-gray-400 mr-1">$</span>
                <input
                    type="number"
                    value={value}
                    onChange={e => onChange(parseInt(e.target.value))}
                    className="w-16 bg-transparent font-bold text-right outline-none"
                />
            </div>
        </div>
    );
}