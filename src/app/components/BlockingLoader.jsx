export default function BlockingLoader({ show, text = "Loading..." }) {
    if (!show) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(255,255,255,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(2px)",
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                style={{
                    width: 340,
                    padding: 18,
                    borderRadius: 14,
                    border: "1px solid #e5e5e5",
                    background: "white",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    fontWeight: 850,
                }}
            >
                <div
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "3px solid #ddd",
                        borderTopColor: "#111",
                        animation: "spin 0.9s linear infinite",
                    }}
                />
                <div>{text}</div>

                <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        </div>
    );
}
