import Sidebar from '../../components/Sidebar';

export default function AdminLayout({ children }) {
    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Hardcoding "admin" here is fine because this layout ONLY wraps admin pages */}
            <Sidebar role="admin" />
            <main className="w-full p-4 md:p-8 md:ml-64 pb-24 md:pb-8">
                {children}
            </main>
        </div>
    );
}