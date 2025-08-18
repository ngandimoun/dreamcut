import { TimelineTrack, TimelineElement } from "@/types/timeline";

/**
 * Calculate the total duration of a timeline based on all tracks and elements
 * @param tracks Array of timeline tracks
 * @returns Duration in seconds
 */
export function calculateTimelineDuration(tracks: TimelineTrack[]): number {
  if (!tracks || tracks.length === 0) return 0;
  
  let maxEndTime = 0;
  
  // Find the maximum end time across all elements in all tracks
  tracks.forEach(track => {
    track.elements.forEach(element => {
      const elementEndTime = element.startTime + element.duration;
      if (elementEndTime > maxEndTime) {
        maxEndTime = elementEndTime;
      }
    });
  });
  
  return maxEndTime;
}

/**
 * Find all elements within a specific time range
 * @param tracks Array of timeline tracks
 * @param startTime Start time in seconds
 * @param endTime End time in seconds
 * @returns Array of elements that overlap with the time range
 */
export function findElementsInTimeRange(
  tracks: TimelineTrack[],
  startTime: number,
  endTime: number
): { element: TimelineElement; track: TimelineTrack }[] {
  const result: { element: TimelineElement; track: TimelineTrack }[] = [];
  
  tracks.forEach(track => {
    track.elements.forEach(element => {
      const elementStartTime = element.startTime;
      const elementEndTime = element.startTime + element.duration;
      
      // Check if the element overlaps with the time range
      if (elementEndTime > startTime && elementStartTime < endTime) {
        result.push({ element, track });
      }
    });
  });
  
  return result;
}

/**
 * Check if two elements overlap in time
 * @param element1 First timeline element
 * @param element2 Second timeline element
 * @returns True if elements overlap, false otherwise
 */
export function checkElementOverlaps(
  element1: TimelineElement,
  element2: TimelineElement
): boolean {
  const element1Start = element1.startTime;
  const element1End = element1.startTime + element1.duration;
  const element2Start = element2.startTime;
  const element2End = element2.startTime + element2.duration;
  
  return element1End > element2Start && element1Start < element2End;
}

/**
 * Resolve overlaps between elements by adjusting their positions
 * @param elements Array of timeline elements to resolve overlaps for
 * @returns Array of elements with resolved overlaps
 */
export function resolveElementOverlaps(elements: TimelineElement[]): TimelineElement[] {
  if (elements.length <= 1) return elements;
  
  const sortedElements = [...elements].sort((a, b) => a.startTime - b.startTime);
  const resolvedElements: TimelineElement[] = [];
  
  for (const element of sortedElements) {
    let adjustedElement = { ...element };
    
    // Check for overlaps with already resolved elements
    for (const resolvedElement of resolvedElements) {
      if (checkElementOverlaps(adjustedElement, resolvedElement)) {
        // Move the current element to start after the resolved element
        adjustedElement = {
          ...adjustedElement,
          startTime: resolvedElement.startTime + resolvedElement.duration
        };
      }
    }
    
    resolvedElements.push(adjustedElement);
  }
  
  return resolvedElements;
}