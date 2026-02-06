import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/mockStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const { productionLog, products } = useStore();

  const data = productionLog.map(p => ({
    batch: p.batchCode.split('-').pop(), // Shorten batch name
    expected: p.expectedInputQty || 0,
    actual: p.inputQty || 0,
    variance: p.variance || 0,
    name: products.find(prod => prod.id === p.outputProductId)?.name || 'Unknown'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Yield Reports</h2>
          <p className="text-muted-foreground">Analyze production efficiency and variances.</p>
        </div>
      </div>

      <Tabs defaultValue="variance">
        <TabsList>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="volume">Production Volume</TabsTrigger>
        </TabsList>
        <TabsContent value="variance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Variance (Actual vs Expected)</CardTitle>
              <CardDescription>Positive variance means excess usage (waste).</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="batch" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="expected" name="Expected Input" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Input" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="volume">
          <Card>
             <CardContent className="pt-6">
               <div className="text-center text-muted-foreground">More charts coming soon...</div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
