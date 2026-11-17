"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
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

type Enrollment = {
  id: number;       // enrollment id
  planId: number;
};

export default function PlansPage() {
  const { t } = useTranslation();
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [publicPlans, setPublicPlans] = useState<Plan[]>([]);
  // map of planId → enrollmentId
  const [enrollments, setEnrollments] = useState<Map<number, number>>(new Map());
  const [enrolling, setEnrolling] = useState<number | null>(null);
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
      const map = new Map<number, number>();
      if (Array.isArray(myPlanRows)) {
        (myPlanRows as Enrollment[]).forEach(e => map.set(e.planId, e.id));
      }
      setMyPlans(authored);
      setPublicPlans(pub);
      setEnrollments(map);
      setLoaded(true);
    });
  }, []);

  async function startPlan(planId: number) {
    setEnrolling(planId);
    const res = await fetch("/api/my-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const row = await res.json();
    setEnrollments(prev => new Map(prev).set(planId, row.id));
    setEnrolling(null);
  }

  async function stopPlan(planId: number) {
    const enrollmentId = enrollments.get(planId);
    if (!enrollmentId) return;
    if (!confirm(t("plans.confirmUnfollow"))) return;
    await fetch(`/api/my-plans/${enrollmentId}`, { method: "DELETE" });
    setEnrollments(prev => { const m = new Map(prev); m.delete(planId); return m; });
  }

  const hasAny = myPlans.length > 0 || publicPlans.length > 0;

  const renderPlan = (p: Plan) => {
    const enrolled = enrollments.has(p.id);
    return (
      <ListItemCustom key={p.id} style={{ padding: "0.75rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "0.75rem" }}>
          <Link href={`/plans/${p.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "var(--sapTextColor)" }}>{p.name}</span>
              {p.isPublic && <Tag design="Set2" colorScheme="8" style={{ fontSize: "0.7rem" }}>{t("plans.public")}</Tag>}
              {enrolled && <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>{t("plans.alreadyFollowing")}</Tag>}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>
              {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""} · {p.weeksCount} week{p.weeksCount !== 1 ? "s" : ""}
              {p.description && ` · ${p.description}`}
            </div>
          </Link>
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            {enrolled ? (
              <Button design="Transparent" onClick={() => stopPlan(p.id)}>
                {t("plans.unfollow")}
              </Button>
            ) : (
              <Button design="Default" onClick={() => startPlan(p.id)} disabled={enrolling === p.id}>
                {enrolling === p.id ? t("plans.addingPlan") : t("plans.startPlan")}
              </Button>
            )}
            <DeleteButton url={`/api/plans/${p.id}`} label={t("plans.delete")} onDeleted={() => setMyPlans(prev => prev.filter(x => x.id !== p.id))} />
          </div>
        </div>
      </ListItemCustom>
    );
  };

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">{t("plans.title")}</Title>
        <Link href="/plans/new">
          <Button design="Emphasized">{t("plans.newPlan")}</Button>
        </Link>
      </FlexBox>

      {loaded && !hasAny && (
        <Card>
          <EmptyState
            name="NoData"
            titleText={t("plans.noPlans")}
            subtitleText={t("plans.noPlansSubtitle")}
          />
        </Card>
      )}

      {myPlans.length > 0 && (
        <Card header={<div style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{t("plans.myPlans")}</div>} style={{ marginBottom: "1.5rem" }}>
          <List>
            {myPlans.map(renderPlan)}
          </List>
        </Card>
      )}

      {publicPlans.length > 0 && (
        <Card header={<div style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{t("plans.publicPlans")}</div>}>
          <List>
            {publicPlans.map(p => {
              const enrolled = enrollments.has(p.id);
              return (
                <ListItemCustom key={p.id} style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "0.75rem" }}>
                    <Link href={`/plans/${p.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "var(--sapTextColor)" }}>{p.name}</span>
                        {enrolled && <Tag design="Set2" colorScheme="5" style={{ fontSize: "0.7rem" }}>{t("plans.alreadyFollowing")}</Tag>}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--sapNeutralTextColor)" }}>
                        {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""} · {p.weeksCount} week{p.weeksCount !== 1 ? "s" : ""}
                        {p.description && ` · ${p.description}`}
                      </div>
                    </Link>
                    <div style={{ flexShrink: 0 }}>
                      {enrolled ? (
                        <Button design="Transparent" onClick={() => stopPlan(p.id)}>
                          {t("plans.unfollow")}
                        </Button>
                      ) : (
                        <Button design="Default" onClick={() => startPlan(p.id)} disabled={enrolling === p.id}>
                          {enrolling === p.id ? t("plans.addingPlan") : t("plans.startPlan")}
                        </Button>
                      )}
                    </div>
                  </div>
                </ListItemCustom>
              );
            })}
          </List>
        </Card>
      )}
    </div>
  );
}
