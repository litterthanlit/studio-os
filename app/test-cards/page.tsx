import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestCardsPage() {
  return (
    <main className="min-h-screen bg-bg-primary p-24 text-text-primary">
      <div className="mx-auto max-w-2xl space-y-12">
        <div className="space-y-4">
          <h1 className="text-2xl font-serif">Card System</h1>
          <p className="text-text-secondary text-sm">
            Testing the container and state designs from Prompt 9.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Base Card</CardTitle>
            </CardHeader>
            <CardContent>
              This is the default base card. It has a white background, 1px border, and a shadow that appears on hover.
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button variant="primary" size="sm" className="ml-2">Action</Button>
            </CardFooter>
          </Card>

          <Card active>
            <CardHeader>
              <CardTitle>Active Card</CardTitle>
            </CardHeader>
            <CardContent>
              This is the active card. It features a 2px indigo border and a subtle inner glow. Ideal for selection states.
            </CardContent>
            <CardFooter>
              <Button variant="primary" size="sm" className="ml-auto">Selected</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-[13px] font-medium text-text-secondary mb-4">Stat Cards</h2>
          <div className="grid grid-cols-3 gap-6 bg-bg-primary">
            <StatCard 
              value="12" 
              label="Active Projects" 
              indicatorColor="#10B981" 
            />
            <StatCard 
              value="34" 
              label="Generated Sites" 
              indicatorColor="#D1E4FC" 
            />
            <StatCard 
              value="8" 
              label="This Week" 
              indicatorColor="#F4F8FF" 
            />
          </div>
        </div>
      </div>
    </main>
  );
}
