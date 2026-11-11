"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  FlexBox,
  FlexBoxJustifyContent,
  List,
  ListItemCustom,
  Tag,
  Title,
} from "@ui5/webcomponents-react";
import { DeleteButton } from "@/components/DeleteButton";
import { EmptyState } from "@/components/EmptyState";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  weeksCount: number;
  isPublic: boolean;
  authorId: string;
  sessionCount: number;
};

type FollowedPlan = {
  planId: number;
  planName: string;
  planDescription: string | null;
  weeksCount: number;
};

export default function PlansPage() {
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [followedPlans, setFollowedPlans] = useState<FollowedPlan[]>([]);
  const [publicPlans, setPublicPlans] = useState<Plan[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then(r => r.json()),
      fetch("/api/plans").then(r => r.json()),
      fetch("/api/my-plans").then(r => r.json()),
    ]).then(([session, plans, myPlanRows]) => {
      const uid = session?.user?.id ?? "";
      const authored: Plan[] = Array.isArray(plans) ? plans.filter((p: Plan) => p.authorId === uid) : [];
      const pub: Plan[] = Array.isArray(plans) ? plans.filter((p: Plan) => p.isPublic && p.authorId !== uid) : [];
      const followed: FollowedPlan[] = Array.isArray(myPlanRows) ? myPlanRows : [];
      // Remove from followed any plans the user authored
      const followedFiltered = followed.filter(f => !authored.some(a => a.id === f.planId));
      setMyPlans(authored);
      setPublicPlans(pub);
      setFollowedPlans(followedFiltered);
      setLoaded(true);
    });
  }, []);

  const hasAny = myPlans.length > 0 || followedPlans.length > 0 || publicPlans.length > 0;

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">Workout Plans</Title>
        <Link href="/plans/new">
          <Button design="Emphasized">New Plan</Button>
        </Link>
      </FlexBox>

      {loaded && !hasAny && (
        <Card>
          <EmptyState
            name="NoData"
            titleText="No plans yet"
            subtitleText="Create your own plan or browse public ones from coaches"
          />
        </Card>
      )}

      {myPlans.length > 0 && (
        <Card header={<div style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>My Plans</div>} style={{ marginBottom: "1.5rem" }}>
          <List>
            {myPlans.map(p => (
              <ListItemCustom key={p.id} style={{ padding: "0.75rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <Link href={`/plans/${p.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--sapTextColor)" }}>{p.name}</span>
                      {p.isPublic && <Tag design="Set2" colorScheme="8" style={{ fontSize: "0.7rem" }}>Public</Tag>}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>
                      {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""} · {p.weeksCount} week{p.weeksCount !== 1 ? "s" : ""}
                      {p.description && ` · ${p.description}`}
                    </div>
                  </Link>
                  <DeleteButton url={`/api/plans/${p.id}`} label="Delete" onDeleted={() => setMyPlans(prev => prev.filter(x => x.id !== p.id))} />
                </div>
              </ListItemCustom>
            ))}
          </List>
        </Card>
      )}

      {followedPlans.length > 0 && (
        <Card header={<div style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Following</div>} style={{ marginBottom: "1.5rem" }}>
          <List>
            {followedPlans.map(p => (
              <ListItemCustom key={p.planId} style={{ padding: "0.75rem 1rem" }}>
                <Link href={`/plans/${p.planId}`} style={{ textDecoration: "none", flex: 1, minWidth: 0, display: "block" }}>
                  <div style={{ fontWeight: 600, color: "var(--sapTextColor)", marginBottom: "0.2rem" }}>{p.planName}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>
                    {p.weeksCount} week{p.weeksCount !== 1 ? "s" : ""}
                    {p.planDescription && ` · ${p.planDescription}`}
                  </div>
                </Link>
              </ListItemCustom>
            ))}
          </List>
        </Card>
      )}

      {publicPlans.length > 0 && (
        <Card header={<div style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Public Plans</div>}>
          <List>
            {publicPlans.map(p => (
              <ListItemCustom key={p.id} style={{ padding: "0.75rem 1rem" }}>
                <Link href={`/plans/${p.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0, display: "block" }}>
                  <div style={{ fontWeight: 600, color: "var(--sapTextColor)", marginBottom: "0.2rem" }}>{p.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>
                    {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""} · {p.weeksCount} week{p.weeksCount !== 1 ? "s" : ""}
                    {p.description && ` · ${p.description}`}
                  </div>
                </Link>
              </ListItemCustom>
            ))}
          </List>
        </Card>
      )}
    </div>
  );
}
