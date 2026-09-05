import { describe, expect, it } from "vitest";
import { ThinkGearParser } from "./neuroband";

function packet(payload: number[]): Uint8Array {
  const sum = payload.reduce((s, b) => (s + b) & 0xff, 0);
  const checksum = (~sum) & 0xff;
  return Uint8Array.from([0xaa, 0xaa, payload.length, ...payload, checksum]);
}

describe("ThinkGearParser", () => {
  it("parses attention, meditation and signal from a complete packet", () => {
    const parser = new ThinkGearParser();
    const samples = parser.push(packet([0x02, 0, 0x04, 72, 0x05, 41]));
    expect(samples).toHaveLength(1);
    expect(samples[0].signal).toBe(0);
    expect(samples[0].attention).toBe(72);
    expect(samples[0].meditation).toBe(41);
  });

  it("reassembles packets split across BLE notify chunks", () => {
    const parser = new ThinkGearParser();
    const full = packet([0x04, 80, 0x05, 20]);
    expect(parser.push(full.slice(0, 4))).toEqual([]);
    const rest = parser.push(full.slice(4));
    expect(rest).toHaveLength(1);
    expect(rest[0].attention).toBe(80);
    expect(rest[0].meditation).toBe(20);
  });

  it("drops a packet with a bad checksum and resyncs", () => {
    const parser = new ThinkGearParser();
    const good = packet([0x04, 10]);
    const bad = Uint8Array.from([0xaa, 0xaa, 2, 0x04, 10, 0x00]);
    expect(parser.push(bad)).toEqual([]);
    const samples = parser.push(good);
    expect(samples).toHaveLength(1);
    expect(samples[0].attention).toBe(10);
  });
});
