import { Header } from '@/components/Header';
import { CameraGrid } from '@/components/CameraGrid';
import { RecordingActionsModal } from '@/components/RecordingActionsModal';

export default function Home() {
  return (
    <main className="min-h-screen bg-thingbeat-blue">
      <Header />
      <div className="p-2">
        <CameraGrid />
      </div>
      <RecordingActionsModal />
    </main>
  );
}
