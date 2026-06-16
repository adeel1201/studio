import { BottomNav } from '@/components/zynqo/BottomNav';
import { CallOverlay } from '@/components/zynqo/CallOverlay';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 pb-20 relative">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {children}
      </main>
      <CallOverlay />
      <BottomNav />
    </div>
  );
}