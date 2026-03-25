import { Metadata } from 'next';
import OperatorDashboard from '@/components/OperatorDashboard';

export const metadata: Metadata = {
  title: 'Operator Dashboard | RailSense',
  description: 'Real-time traffic control and bottleneck management',
};

export default function OperatorPage() {
  return <OperatorDashboard />;
}
