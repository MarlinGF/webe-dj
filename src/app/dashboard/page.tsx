import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline">Dashboard</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-6 w-6" /> Office</CardTitle>
                <CardDescription>Manage your station's administrative tasks. This area is under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                    <div className="text-center text-muted-foreground">
                        <p className="font-semibold">Coming Soon</p>
                        <p className="text-sm">Program schedules, DJ management, API connections, and more!</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
