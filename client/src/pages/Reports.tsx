import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/mockStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const { productionLog, packouts, products } = useStore();

  const varianceData = productionLog.map(p => ({
    batch: p.batchCode.split('-').pop(), // Shorten batch name
    expected: p.expectedInputQty || 0,
    actual: p.inputQty || 0,
    variance: p.variance || 0,
    name: products.find(prod => prod.id === p.outputProductId)?.name || 'Unknown'
  }));

  // Simple Mass Balance Calc (Mock Logic)
  // For each product: Total Input (Created via Production) - Total Output (Used in Production + Packed Out)
  const productBalance = products.map(prod => {
    // 1. Production Output (Gained)
    const gained = productionLog
      .filter(log => log.outputProductId === prod.id)
      .reduce((acc, log) => acc + log.outputQty, 0);

    // 2. Production Input (Consumed)
    const consumedInProduction = productionLog
      .filter(log => log.inputProductId === prod.id)
      .reduce((acc, log) => acc + (log.inputQty || 0), 0);
    
    // 3. Packout (Consumed/Shipped)
    const shipped = packouts
      .filter(pk => pk.productId === prod.id)
      .reduce((acc, pk) => acc + pk.qty, 0);

    const totalConsumed = consumedInProduction + shipped;
    const balance = gained - totalConsumed; // Simple Stock logic

    // Overs/Unders Logic:
    // Usually this requires a "Stock Count". Since we don't have stock counts in mock store yet,
    // We will simulate "Daily Overs/Unders" as the difference between Expected Usage vs Actual Usage
    // accumulated for the day.
    
    // Let's use Variance Sum for Overs/Unders for now as it's the most accurate "Loss" metric we have.
    const varianceSum = productionLog
      .filter(log => log.inputProductId === prod.id && log.variance)
      .reduce((acc, log) => acc + (log.inputQty! - log.expectedInputQty!), 0);

    return {
      id: prod.id,
      name: prod.name,
      unit: prod.unitType,
      produced: gained,
      consumed: totalConsumed,
      balance: balance, // Theoretical Stock
      oversUnders: varianceSum // Actual Loss/Gain during processing
    };
  }).filter(p => p.produced > 0 || p.consumed > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Yield Reports</h2>
          <p className="text-muted-foreground">Analyze production efficiency, variances, and daily balances.</p>
        </div>
      </div>

      <Tabs defaultValue="balance">
        <TabsList>
          <TabsTrigger value="balance">Daily Overs/Unders (Mass Balance)</TabsTrigger>
          <TabsTrigger value="variance">Batch Variance Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="balance" className="space-y-4">
           <Card>
            <CardHeader>
              <CardTitle>Daily Product Balance & Loss</CardTitle>
              <CardDescription>
                Tracking theoretical stock vs processing losses (Overs/Unders).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Consumed/Packed</TableHead>
                    <TableHead className="text-right">Theoretical Stock</TableHead>
                    <TableHead className="text-right">Processing Loss (Over/Under)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productBalance.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.produced.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unit}</span></TableCell>
                      <TableCell className="text-right">{row.consumed.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unit}</span></TableCell>
                      <TableCell className="text-right font-mono">{row.balance.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unit}</span></TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Math.abs(row.oversUnders) > 5 ? 'destructive' : 'outline'} className={row.oversUnders === 0 ? 'bg-muted text-muted-foreground border-transparent' : ''}>
                           {row.oversUnders > 0 ? '+' : ''}{row.oversUnders.toFixed(2)} {row.unit}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {productBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No activity recorded today.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="variance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Variance (Actual vs Expected)</CardTitle>
              <CardDescription>Positive variance means excess usage (waste).</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceData}>
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
      </Tabs>
    </div>
  );
}
