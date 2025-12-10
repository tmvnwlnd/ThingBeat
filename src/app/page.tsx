import { Header } from '@/components/Header';
import { CameraGrid } from '@/components/CameraGrid';
import { RecordingActionsModal } from '@/components/RecordingActionsModal';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { SubmissionModal } from '@/components/SubmissionModal';

export default function Home() {
  return (
    <main className="min-h-screen bg-thingbeat-blue">
      <Header />
      <div className="p-2">
        <CameraGrid />
      </div>
      <RecordingActionsModal />
      <DeleteConfirmationModal />
      <SubmissionModal />
    </main>
  );
}
