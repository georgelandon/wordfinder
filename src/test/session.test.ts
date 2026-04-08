import { describe, expect, it } from "vitest";
import {
  applyRoundTotalsToSessionTotals,
  canStartRound,
  getResultsPresentationState,
  pickNextHost,
  resolveHostPlayerId
} from "@shared/game/session";

const players = [
  {
    id: "host",
    room_id: "room",
    auth_user_id: "u1",
    nickname: "Host",
    ready: true,
    connected: true,
    device_kind: "controller" as const,
    joined_at: "2026-04-06T20:00:00.000Z",
    last_seen_at: "2026-04-06T20:00:20.000Z",
    disconnected_at: null,
    updated_at: "2026-04-06T20:00:20.000Z"
  },
  {
    id: "next",
    room_id: "room",
    auth_user_id: "u2",
    nickname: "Next",
    ready: true,
    connected: true,
    device_kind: "controller" as const,
    joined_at: "2026-04-06T20:00:05.000Z",
    last_seen_at: "2026-04-06T20:00:20.000Z",
    disconnected_at: null,
    updated_at: "2026-04-06T20:00:20.000Z"
  }
];

describe("host assignment", () => {
  it("picks the earliest joined active player as host", () => {
    expect(pickNextHost(players, Date.parse("2026-04-06T20:00:25.000Z"))).toBe("host");
  });

  it("reassigns host when the current host goes stale", () => {
    const stalePlayers = [
      {
        ...players[0],
        last_seen_at: "2026-04-06T19:59:00.000Z"
      },
      players[1]
    ];

    expect(
      resolveHostPlayerId(stalePlayers, "host", Date.parse("2026-04-06T20:00:40.000Z"))
    ).toBe("next");
  });
});

describe("round sequencing", () => {
  it("prevents starting the next round before the previous summary is ready", () => {
    expect(
      canStartRound("results", null, {
        status: "results",
        summary_ready_at: null,
        results_published_at: null,
        scored_at: null
      })
    ).toBe(false);
  });

  it("keeps the next round locked while the celebration reel is still running", () => {
    expect(
      canStartRound("results", null, {
        status: "results",
        summary_ready_at: "2026-04-06T20:04:00.000Z",
        results_published_at: "2026-04-06T20:04:00.000Z",
        scored_at: "2026-04-06T20:04:00.000Z"
      },
      [
        { normalized_word: "toast", status: "valid" },
        { normalized_word: "stone", status: "valid" }
      ],
      Date.parse("2026-04-06T20:04:01.000Z")
    )).toBe(false);
  });

  it("allows a new round once the celebration hands off to the summary", () => {
    expect(
      canStartRound("results", null, {
        status: "results",
        summary_ready_at: "2026-04-06T20:04:00.000Z",
        results_published_at: "2026-04-06T20:04:00.000Z",
        scored_at: "2026-04-06T20:04:00.000Z"
      },
      [
        { normalized_word: "toast", status: "valid" },
        { normalized_word: "stone", status: "valid" }
      ],
      Date.parse("2026-04-06T20:04:08.000Z")
    )
    ).toBe(true);
  });

  it("reports the presentation stage for celebration and summary screens", () => {
    expect(
      getResultsPresentationState(
        {
          status: "results",
          summary_ready_at: "2026-04-06T20:04:00.000Z",
          results_published_at: "2026-04-06T20:04:00.000Z",
          scored_at: "2026-04-06T20:04:00.000Z"
        },
        [
          { normalized_word: "toast", status: "valid" },
          { normalized_word: "stone", status: "duplicate_global" }
        ],
        Date.parse("2026-04-06T20:04:01.000Z")
      ).stage
    ).toBe("celebration");

    expect(
      getResultsPresentationState(
        {
          status: "results",
          summary_ready_at: "2026-04-06T20:04:00.000Z",
          results_published_at: "2026-04-06T20:04:00.000Z",
          scored_at: "2026-04-06T20:04:00.000Z"
        },
        [
          { normalized_word: "toast", status: "valid" },
          { normalized_word: "stone", status: "duplicate_global" }
        ],
        Date.parse("2026-04-06T20:04:08.000Z")
      ).stage
    ).toBe("summary");
  });
});

describe("session totals", () => {
  it("accumulates scores across multiple rounds", () => {
    const firstPass = applyRoundTotalsToSessionTotals(
      "room",
      [],
      [
        {
          playerId: "host",
          totalPoints: 4,
          validWordCount: 2,
          duplicateWordCount: 0,
          invalidWordCount: 1,
          rank: 1
        },
        {
          playerId: "next",
          totalPoints: 2,
          validWordCount: 1,
          duplicateWordCount: 0,
          invalidWordCount: 1,
          rank: 2
        }
      ]
    );

    const secondPass = applyRoundTotalsToSessionTotals(
      "room",
      firstPass,
      [
        {
          playerId: "host",
          totalPoints: 1,
          validWordCount: 1,
          duplicateWordCount: 0,
          invalidWordCount: 0,
          rank: 2
        },
        {
          playerId: "next",
          totalPoints: 5,
          validWordCount: 2,
          duplicateWordCount: 0,
          invalidWordCount: 0,
          rank: 1
        }
      ]
    );

    expect(secondPass.find((item) => item.player_id === "host")?.cumulative_points).toBe(5);
    expect(secondPass.find((item) => item.player_id === "next")?.cumulative_points).toBe(7);
  });
});
