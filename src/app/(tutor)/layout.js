import Sidebar from '../../components/Sidebar';

export default function TutorLayout({ children }) {
    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar role="tutor" />
            {/*   UPDATED: Removed hard ml-64, added pb-24 for mobile bottom bar */}
            <main className="w-full p-4 md:p-8 md:ml-64 pb-24 md:pb-8">
                {children}
            </main>
        </div>
    );
}