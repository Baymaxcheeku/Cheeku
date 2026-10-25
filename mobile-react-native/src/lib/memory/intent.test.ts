import { describe, expect, it } from "vitest";

import { bookingIntent, memberIntent, type MemberLike } from "./intent";
import type { LoopView } from "./loops";
import type { Series } from "./series";

function series(key: string, name: string, value: number, date: string, unit: string | null = null): Series {
  const point = { date, value, source: "record" as const, documentId: "d1", factId: null, refRange: null, flag: null };
  return { key, name, unit, points: [point], latest: point, previous: null } as unknown as Series;
}

const hba1cLoop = {
  key: "test:hba1c",
  type: "test_ordered",
  title: "HbA1c",
  detail: "Repeat after 3 months",
  openedOn: "2026-07-12",
  dueBy: "2026-12-14",
  status: "open",
  closedBy: null,
  sourceDocumentId: "rx1",
  relatesTo: [],
  daysOpen: 84,
  daysToDue: 70,
  overdue: false,
} as LoopView;

const memory = {
  loops: [hba1cLoop],
  series: new Map([
    ["hba1c", series("hba1c", "HbA1c", 5.9, "2026-07-12", "%")],
    ["glucose_fasting", series("glucose_fasting", "Fasting glucose", 103, "2026-07-12", "mg/dL")],
  ]),
};
const empty = { loops: [], series: new Map<string, Series>() };

describe("booking intent", () => {
  it("'book test again' finds the open HbA1c and says why", () => {
    const i = bookingIntent("Book test again", memory);
    expect(i?.service).toBe("lab");
    expect(i?.again).toBe(true);
    expect(i?.tests.map((t) => t.id)).toEqual(["hba1c"]);
    expect(i?.tests[0]?.because).toMatch(/Due in 10 weeks, last 5.9% on/);
  });

  it("without an open loop, 'again' means the most recent lab panel", () => {
    const i = bookingIntent("repeat my blood test", { loops: [], series: memory.series });
    expect(i?.tests.map((t) => t.id).sort()).toEqual(["fbs", "hba1c"]);
  });

  it("a named test wins over memory", () => {
    expect(bookingIntent("book a thyroid test for tomorrow", memory)?.tests.map((t) => t.id)).toEqual(["thyroid"]);
  });

  it("never guesses a test when the memory is empty", () => {
    const i = bookingIntent("book test again", empty);
    expect(i?.service).toBe("lab");
    expect(i?.tests).toEqual([]);
  });

  it("a question about a result is not a booking", () => {
    expect(bookingIntent("What was my HbA1c last time?", memory)).toBeNull();
    expect(bookingIntent("I want to know my HbA1c", memory)).toBeNull();
    expect(bookingIntent("Imaad has a cough since last night", memory)).toBeNull();
  });

  it("doctors, with a specialty only when named, and the way to meet", () => {
    expect(bookingIntent("I need to see a doctor", empty)).toMatchObject({ service: "doctor", specialty: null, mode: null });
    expect(bookingIntent("book a gynaecologist online", empty)).toMatchObject({ service: "doctor", specialty: "gynae", mode: "online" });
    expect(bookingIntent("Book a dietician for Nisha", empty)).toMatchObject({ service: "doctor", specialty: "diet" });
    expect(bookingIntent("book a doctor to go over my HbA1c", memory)?.service).toBe("doctor");
  });

  it("services that are not live yet are still recognised", () => {
    expect(bookingIntent("book a prenatal yoga class", empty)).toMatchObject({ service: "fitness", activity: "prenatal_yoga" });
    expect(bookingIntent("order my medicines", empty)?.service).toBe("medicine");
  });
});

describe("fitness intent", () => {
  const empty = { loops: [], series: new Map() };

  it("finds a class when someone is looking, even as a question", () => {
    expect(bookingIntent("any yoga classes near me?", empty)).toMatchObject({ service: "fitness", activity: "yoga" });
    expect(bookingIntent("find a gym nearby", empty)).toMatchObject({ service: "fitness", activity: "gym" });
    expect(bookingIntent("suggest a swimming session for Papa", empty)).toMatchObject({ service: "fitness", activity: "swimming" });
    expect(bookingIntent("book a fitness class", empty)).toMatchObject({ service: "fitness", activity: null });
  });

  it("leaves questions about exercise to the answer", () => {
    expect(bookingIntent("is yoga good for BP?", empty)).toBeNull();
    expect(bookingIntent("my knee hurts after gym sessions", empty)).toBeNull();
    expect(bookingIntent("how many calories does swimming burn", empty)).toBeNull();
  });
});

describe("member intent", () => {
  const members: MemberLike[] = [
    { id: "a", name: "Athar Ali", relationship: null, isPrimary: true, dob: "1994-03-12" },
    { id: "n", name: "Nisha Ali", relationship: "Wife", isPrimary: false, dob: "1996-07-02" },
    { id: "i", name: "Imaad Ali", relationship: "Son", isPrimary: false, dob: "2026-09-12" },
  ];
  const today = new Date(2026, 9, 4);

  it("switches on a name", () => {
    expect(memberIntent("Imaad has been sleepy all day", members, "a", today)).toMatchObject({ id: "i", name: "Imaad" });
    expect(memberIntent("book Nisha's thyroid test again", members, "a", today)?.id).toBe("n");
  });

  it("switches on a relationship or 'the baby'", () => {
    expect(memberIntent("my wife has a headache", members, "a", today)?.id).toBe("n");
    expect(memberIntent("the baby is not feeding well", members, "a", today)?.id).toBe("i");
  });

  it("goes back to the account holder on 'for me'", () => {
    expect(memberIntent("book a test for me", members, "i", today)?.id).toBe("a");
  });

  it("stays put when it is the same person, nobody, or two people", () => {
    expect(memberIntent("Imaad is better today", members, "i", today)).toBeNull();
    expect(memberIntent("book test again", members, "a", today)).toBeNull();
    expect(memberIntent("Nisha and Imaad both have colds", members, "a", today)).toBeNull();
  });
});

describe("services from the chat", () => {
  it("routes specialised care to its service page", () => {
    expect(bookingIntent("book a physio at home for my back", empty)).toMatchObject({ service: "care", careId: "physio" });
    expect(bookingIntent("need a nurse at home for dressing", empty)).toMatchObject({ service: "care", careId: "homecare" });
    expect(bookingIntent("book an ambulance to take dad home from hospital", empty)).toMatchObject({ service: "care", careId: "ambulance" });
    expect(bookingIntent("book an eye test", empty)).toMatchObject({ service: "care", careId: "eye" });
  });

  it("a named specialist is a doctor booking, with the pre-consultation note", () => {
    expect(bookingIntent("book a psychologist online", empty)).toMatchObject({ service: "doctor", specialty: "psych", mode: "online" });
    expect(bookingIntent("I need to see a psychiatrist", empty)).toMatchObject({ service: "doctor", specialty: "psychiatry" });
    expect(bookingIntent("book a dentist for Saturday", empty)).toMatchObject({ service: "doctor", specialty: "dental" });
  });
});
