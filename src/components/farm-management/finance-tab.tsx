"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { formatDate } from "@/lib/utils/date-helpers";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CATEGORIES = {
  income: ["作物銷售", "補助款", "其他收入"],
  expense: ["種子種苗", "肥料", "農藥", "人工", "機具", "水電", "運輸", "其他支出"],
};

export function FinanceTab() {
  const { financeRecords, addFinanceRecord, removeFinanceRecord } = useFarmManagement();

  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!category || !amount) return;
    addFinanceRecord({
      type,
      category,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      description,
    });
    setAmount("");
    setDescription("");
  };

  const totalIncome = financeRecords.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = financeRecords.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  const chartData = useMemo(() => {
    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};
    financeRecords.forEach((r) => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expense: 0 };
      monthMap[key][r.type] += r.amount;
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [financeRecords]);

  const sorted = [...financeRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="size-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">總收入</p>
              <p className="text-xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingDown className="size-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">總支出</p>
              <p className="text-xl font-bold text-red-600">${totalExpense.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">收支趨勢</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#22c55e" />
                <Bar dataKey="expense" name="支出" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <Select value={type} onValueChange={(v) => { setType(v as "income" | "expense"); setCategory(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">收入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="分類" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES[type].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button onClick={handleAdd} disabled={!category || !amount}>
              <Plus className="size-4 mr-1" />新增
            </Button>
          </div>
          <Input className="mt-2" placeholder="說明（選填）" value={description} onChange={(e) => setDescription(e.target.value)} />
        </CardContent>
      </Card>

      {sorted.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>分類</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>說明</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                <TableCell>
                  <Badge variant={r.type === "income" ? "default" : "destructive"} className="text-xs">
                    {r.type === "income" ? "收入" : "支出"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.category}</TableCell>
                <TableCell className={`text-sm font-medium ${r.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  ${r.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.description || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeFinanceRecord(r.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {sorted.length === 0 && (
        <p className="text-center text-muted-foreground py-8">尚無財務紀錄</p>
      )}
    </div>
  );
}
