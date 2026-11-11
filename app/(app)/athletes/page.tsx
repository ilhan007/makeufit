import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { coachRelationships, users, workouts } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { AcceptRequestButton } from "@/components/coach/AcceptRequestButton";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  FlexBox,
  FlexBoxJustifyContent,
  Tag,
  Text,
  Title,
} from "@ui5/webcomponents-react";

export default async function AthletesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [pendingRequests, acceptedAthletes] = await Promise.all([
    getDb().select({
      id: coachRelationships.id,
      athleteName: users.name,
      athleteEmail: users.email,
      athleteImage: users.image,
      athleteId: users.id,
      createdAt: coachRelationships.createdAt,
    })
      .from(coachRelationships)
      .innerJoin(users, eq(users.id, coachRelationships.athleteId))
      .where(and(eq(coachRelationships.coachId, userId), eq(coachRelationships.status, "pending"))),

    getDb().select({
      relationshipId: coachRelationships.id,
      athleteId: users.id,
      athleteName: users.name,
      athleteEmail: users.email,
      athleteImage: users.image,
    })
      .from(coachRelationships)
      .innerJoin(users, eq(users.id, coachRelationships.athleteId))
      .where(and(eq(coachRelationships.coachId, userId), eq(coachRelationships.status, "accepted"))),
  ]);

  const athletesWithStats = await Promise.all(
    acceptedAthletes.map(async (a) => {
      const [lastWorkout, [wCount]] = await Promise.all([
        getDb().select({ date: workouts.date, name: workouts.name })
          .from(workouts)
          .where(eq(workouts.userId, a.athleteId))
          .orderBy(desc(workouts.date))
          .limit(1),
        getDb().select({ count: count() }).from(workouts).where(eq(workouts.userId, a.athleteId)),
      ]);
      return { ...a, lastWorkout: lastWorkout[0] ?? null, totalWorkouts: wCount.count };
    })
  );

  const initials = (name: string | null) =>
    name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div>
      <FlexBox justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: "1.5rem", alignItems: "center" }}>
        <Title level="H2">Athletes</Title>
        <Link href="/plans">
          <Button design="Default">Manage Plans</Button>
        </Link>
      </FlexBox>

      {pendingRequests.length > 0 && (
        <Card
          header={<CardHeader titleText="Pending Requests" subtitleText={`${pendingRequests.length} waiting`} />}
          style={{ marginBottom: "1.5rem" }}
        >
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {pendingRequests.map(r => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "0.75rem", marginBottom: "0.5rem",
                borderRadius: 8, background: "var(--sapHighlightColor, #e8f4ff)",
                border: "1px solid var(--sapSelectedColor, #0070f2)",
              }}>
                <Avatar initials={initials(r.athleteName)} colorScheme="Accent5" size="S">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.athleteImage && <img src={r.athleteImage} alt={r.athleteName ?? "Athlete"} />}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 600, display: "block" }}>{r.athleteName ?? r.athleteEmail}</Text>
                  <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>{r.athleteEmail}</Text>
                </div>
                <AcceptRequestButton requestId={r.id} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card header={<CardHeader titleText="My Athletes" subtitleText={`${athletesWithStats.length} active`} />}>
        {athletesWithStats.length === 0 ? (
          <EmptyState name="NoEntries" titleText="No athletes yet" subtitleText="Athletes appear here once they send you a request and you accept" />
        ) : (
          <div style={{ padding: "0.5rem 1rem 1rem" }}>
            {athletesWithStats.map(a => (
              <Link key={a.athleteId} href={`/athletes/${a.athleteId}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 8, cursor: "pointer",
                  background: "var(--sapTileBackground)",
                  border: "1px solid var(--sapTileBorderColor)",
                }}>
                  <Avatar initials={initials(a.athleteName)} colorScheme="Accent3" size="S">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.athleteImage && <img src={a.athleteImage} alt={a.athleteName ?? "Athlete"} />}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 600, display: "block" }}>{a.athleteName ?? a.athleteEmail}</Text>
                    <Text style={{ color: "var(--sapNeutralTextColor)", fontSize: "0.875rem" }}>
                      {a.totalWorkouts} workout{a.totalWorkouts !== 1 ? "s" : ""}
                      {a.lastWorkout ? ` · Last: ${new Date(a.lastWorkout.date).toLocaleDateString()}` : ""}
                    </Text>
                  </div>
                  <Tag design="Set2" colorScheme="8">Active</Tag>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
