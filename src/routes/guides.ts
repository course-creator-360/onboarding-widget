import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import type { Guide } from '../guides/types';

const router = Router();

// Cache for loaded guides
const guidesCache = new Map<string, Guide>();

/**
 * Load a guide from the guides directory
 */
function loadGuide(guideId: string): Guide | null {
  // Check cache first
  if (guidesCache.has(guideId)) {
    return guidesCache.get(guideId)!;
  }

  try {
    const guidePath = path.join(process.cwd(), 'src', 'guides', `${guideId}.json`);
    const guideContent = fs.readFileSync(guidePath, 'utf-8');
    const guide: Guide = JSON.parse(guideContent);
    
    // Cache the guide
    guidesCache.set(guideId, guide);
    
    return guide;
  } catch (error) {
    console.error(`[Guides] Failed to load guide "${guideId}":`, error);
    return null;
  }
}

/**
 * Get list of all available guides
 */
function listGuides(): string[] {
  try {
    const guidesDir = path.join(process.cwd(), 'src', 'guides');
    const files = fs.readdirSync(guidesDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error('[Guides] Failed to list guides:', error);
    return [];
  }
}

/**
 * GET /api/guides
 * List all available guides
 */
router.get('/guides', (_req, res) => {
  try {
    const guides = listGuides();
    res.json({
      success: true,
      guides: guides.map(id => {
        const guide = loadGuide(id);
        return {
          id,
          title: guide?.title || id,
          description: guide?.description || ''
        };
      })
    });
  } catch (error) {
    console.error('[Guides] Error listing guides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list guides'
    });
  }
});

/**
 * GET /api/guides/:id
 * Get a specific guide by ID
 */
router.get('/guides/:id', (req, res) => {
  try {
    const { id } = req.params;
    const guide = loadGuide(id);
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide not found'
      });
    }

    res.json({
      success: true,
      guide
    });
  } catch (error) {
    console.error('[Guides] Error fetching guide:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guide'
    });
  }
});

/**
 * GET /api/guides/:id/sections/:sectionId
 * Get a specific section from a guide
 */
router.get('/guides/:id/sections/:sectionId', (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const guide = loadGuide(id);
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide not found'
      });
    }

    const section = guide.sections.find(s => s.id === sectionId);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    res.json({
      success: true,
      section
    });
  } catch (error) {
    console.error('[Guides] Error fetching section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch section'
    });
  }
});

/**
 * GET /api/guides/:id/framework/:framework
 * Get guide content filtered by framework
 */
router.get('/guides/:id/framework/:framework', (req, res) => {
  try {
    const { id, framework } = req.params;
    const guide = loadGuide(id);
    
    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guide not found'
      });
    }

    // Filter sections to only include those relevant to the framework
    const filteredSections = guide.sections.filter(section => {
      // If no frameworks specified, include the section
      if (!section.frameworks || section.frameworks.length === 0) {
        return true;
      }
      // Include if the framework matches
      return section.frameworks.includes(framework);
    });

    const filteredGuide = {
      ...guide,
      sections: filteredSections
    };

    res.json({
      success: true,
      guide: filteredGuide
    });
  } catch (error) {
    console.error('[Guides] Error filtering guide by framework:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter guide'
    });
  }
});

export default router;
