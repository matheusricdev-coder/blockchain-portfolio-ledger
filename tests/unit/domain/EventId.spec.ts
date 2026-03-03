import { EventId } from '../../../src/domain/value-objects/EventId';

describe('EventId', () => {
  const chainId = 11155111;
  const blockNumber = 7000000;
  const txHash = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123';
  const logIndex = 2;

  describe('create()', () => {
    it('should create a valid EventId with correct string format', () => {
      const eventId = EventId.create(chainId, blockNumber, txHash, logIndex);
      expect(eventId.toString()).toBe(`${chainId}:${blockNumber}:${txHash}:${logIndex}`);
    });

    it('should create unique EventIds for different logIndexes', () => {
      const id1 = EventId.create(chainId, blockNumber, txHash, 0);
      const id2 = EventId.create(chainId, blockNumber, txHash, 1);
      expect(id1.equals(id2)).toBe(false);
    });

    it('should create unique EventIds for different txHashes', () => {
      const id1 = EventId.create(chainId, blockNumber, '0xaaa', logIndex);
      const id2 = EventId.create(chainId, blockNumber, '0xbbb', logIndex);
      expect(id1.equals(id2)).toBe(false);
    });

    it('should create unique EventIds for different blockNumbers', () => {
      const id1 = EventId.create(chainId, 100, txHash, logIndex);
      const id2 = EventId.create(chainId, 101, txHash, logIndex);
      expect(id1.equals(id2)).toBe(false);
    });

    it('should create unique EventIds for different chainIds', () => {
      const id1 = EventId.create(1, blockNumber, txHash, logIndex);
      const id2 = EventId.create(137, blockNumber, txHash, logIndex);
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('fromString()', () => {
    it('should parse a valid EventId string', () => {
      const raw = `${chainId}:${blockNumber}:${txHash}:${logIndex}`;
      const eventId = EventId.fromString(raw);
      expect(eventId.toString()).toBe(raw);
    });

    it('should throw for an invalid format (too few parts)', () => {
      expect(() => EventId.fromString('11155111:7000000:0xabc')).toThrow();
    });

    it('should throw for an empty string', () => {
      expect(() => EventId.fromString('')).toThrow();
    });
  });

  describe('equals()', () => {
    it('should return true for identical EventIds', () => {
      const id1 = EventId.create(chainId, blockNumber, txHash, logIndex);
      const id2 = EventId.create(chainId, blockNumber, txHash, logIndex);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different EventIds', () => {
      const id1 = EventId.create(chainId, blockNumber, txHash, 0);
      const id2 = EventId.create(chainId, blockNumber, txHash, 1);
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
