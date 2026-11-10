"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  FlexBox,
  FlexBoxDirection,
  Option,
  Select,
  Text,
  Title,
} from "@ui5/webcomponents-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  weightData: Array<{ date: string; weight: number }>;
  exerciseList: Array<{ id: number; name: string }>;
  prData: Record<number, Array<{ date: string; maxWeight: number }>>;
};

export function ProgressCharts({ weightData, exerciseList, prData }: Props) {
  const [selectedExId, setSelectedExId] = useState<number>(exerciseList[0]?.id ?? 0);
  const prChartData = selectedExId ? (prData[selectedExId] ?? []) : [];

  return (
    <div>
      <Title level="H2" style={{ marginBottom: "1.5rem" }}>Progress</Title>

      <Card header={<CardHeader titleText="Body Weight Over Time" />} style={{ marginBottom: "2rem" }}>
        {weightData.length === 0 ? (
          <div style={{ padding: "1rem" }}><Text>No weight data yet. Log your first body metric!</Text></div>
        ) : (
          <div style={{ padding: "1rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} kg`, "Weight"]} />
                <Line type="monotone" dataKey="weight" stroke="var(--sapChart_OrderedColor_1, #5899DA)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card header={<CardHeader titleText="Exercise Progress (Max Weight)" />}>
        <FlexBox direction={FlexBoxDirection.Column} style={{ padding: "1rem", gap: "1rem" }}>
          <Select onChange={(e) => setSelectedExId(Number(e.detail.selectedOption.value))}>
            {exerciseList.map((ex) => (
              <Option key={ex.id} value={String(ex.id)} selected={ex.id === selectedExId}>
                {ex.name}
              </Option>
            ))}
          </Select>
          {prChartData.length === 0 ? (
            <Text>No data for this exercise yet.</Text>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} unit=" kg" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} kg`, "Max Weight"]} />
                <Line type="monotone" dataKey="maxWeight" stroke="var(--sapChart_OrderedColor_2, #E8743B)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </FlexBox>
      </Card>
    </div>
  );
}
