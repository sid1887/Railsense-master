import { Metadata } from 'next';
import TrainDetailPage from '../components/TrainDetailContent';

export const metadata: Metadata = {
  title: 'Train Details | Railsense',
  description: 'Real-time train analytics and movement tracking',
};

interface TrainDetailProps {
  params: Promise<{
    number: string;
  }>;
}

export default async function Page({ params }: TrainDetailProps) {
  const { number } = await params;

  return <TrainDetailPage trainNumber={number} />;
}
