#!/usr/bin/env python3
"""
Generate player heatmap from position data.
Creates a visual heatmap overlaid on a soccer field.
"""

import json
import argparse
import sys
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Arc, Circle
from scipy.ndimage import gaussian_filter


def draw_soccer_field(ax, field_color='#2d5016', line_color='white'):
    """
    Draw a soccer field on the given matplotlib axis.
    
    Args:
        ax: Matplotlib axis
        field_color: Background color of the field
        line_color: Color of field markings
    """
    # Set field color
    ax.set_facecolor(field_color)
    
    # Field dimensions (normalized 0-100)
    field_length = 100
    field_width = 100
    
    # Outer boundary
    ax.plot([0, 0], [0, field_width], color=line_color, linewidth=2)
    ax.plot([0, field_length], [field_width, field_width], color=line_color, linewidth=2)
    ax.plot([field_length, field_length], [field_width, 0], color=line_color, linewidth=2)
    ax.plot([field_length, 0], [0, 0], color=line_color, linewidth=2)
    
    # Halfway line
    ax.plot([field_length/2, field_length/2], [0, field_width], color=line_color, linewidth=2)
    
    # Center circle
    center_circle = Circle((field_length/2, field_width/2), 9.15, fill=False, 
                           edgecolor=line_color, linewidth=2)
    ax.add_patch(center_circle)
    
    # Center spot
    ax.plot(field_length/2, field_width/2, 'o', color=line_color, markersize=3)
    
    # Penalty areas
    penalty_area_length = 16.5
    penalty_area_width = 40.3
    
    # Left penalty area
    left_penalty = Rectangle((0, (field_width - penalty_area_width)/2), 
                             penalty_area_length, penalty_area_width,
                             fill=False, edgecolor=line_color, linewidth=2)
    ax.add_patch(left_penalty)
    
    # Right penalty area
    right_penalty = Rectangle((field_length - penalty_area_length, 
                               (field_width - penalty_area_width)/2),
                              penalty_area_length, penalty_area_width,
                              fill=False, edgecolor=line_color, linewidth=2)
    ax.add_patch(right_penalty)
    
    # Goal areas
    goal_area_length = 5.5
    goal_area_width = 18.32
    
    # Left goal area
    left_goal = Rectangle((0, (field_width - goal_area_width)/2),
                          goal_area_length, goal_area_width,
                          fill=False, edgecolor=line_color, linewidth=2)
    ax.add_patch(left_goal)
    
    # Right goal area
    right_goal = Rectangle((field_length - goal_area_length,
                            (field_width - goal_area_width)/2),
                           goal_area_length, goal_area_width,
                           fill=False, edgecolor=line_color, linewidth=2)
    ax.add_patch(right_goal)
    
    # Penalty spots
    ax.plot(11, field_width/2, 'o', color=line_color, markersize=3)
    ax.plot(field_length - 11, field_width/2, 'o', color=line_color, markersize=3)
    
    # Set axis limits and aspect
    ax.set_xlim(-5, field_length + 5)
    ax.set_ylim(-5, field_width + 5)
    ax.set_aspect('equal')
    ax.axis('off')


def generate_heatmap(positions_file, output_file, team_filter=None, sigma=3.0, scatter=False):
    """
    Generate heatmap from position data.
    
    Args:
        positions_file: Path to JSON file with position data
        output_file: Path to save heatmap image
        team_filter: Filter by team ('A', 'B', or None for both)
        sigma: Gaussian smoothing factor (higher = smoother)
        scatter: If True, plot individual points instead of heatmap
    """
    print(f"Loading position data from: {positions_file}")
    
    with open(positions_file, 'r') as f:
        data = json.load(f)
    
    positions = data['positions']
    
    # Filter by team if specified
    if team_filter:
        positions = [p for p in positions if p['team'] == team_filter]
        print(f"Filtered to Team {team_filter}: {len(positions)} positions")
    else:
        print(f"Using all positions: {len(positions)}")
    
    if len(positions) == 0:
        print("ERROR: No positions found after filtering", file=sys.stderr)
        sys.exit(1)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8), facecolor='white')
    
    # Draw soccer field
    draw_soccer_field(ax)
    
    if scatter:
        print("Generating scatter plot...")
        # Extract coordinates and teams
        x_coords = [p['x'] for p in positions]
        y_coords = [p['y'] for p in positions]
        teams = [p['team'] for p in positions]
        
        # Define colors
        colors = ['red' if t == 'A' else 'blue' for t in teams]
        
        # Plot scatter points
        ax.scatter(x_coords, y_coords, c=colors, s=50, alpha=0.7, edgecolors='white')
        
        # Add legend
        from matplotlib.lines import Line2D
        legend_elements = [
            Line2D([0], [0], marker='o', color='w', label='Team A',
                   markerfacecolor='red', markersize=10),
            Line2D([0], [0], marker='o', color='w', label='Team B',
                   markerfacecolor='blue', markersize=10)
        ]
        ax.legend(handles=legend_elements, loc='upper right')
        
    else:
        print("Generating density heatmap...")
        
        # If showing both teams, create separate heatmaps for each
        if not team_filter:
            # Separate positions by team
            team_a_positions = [p for p in positions if p['team'] == 'A']
            team_b_positions = [p for p in positions if p['team'] == 'B']
            
            print(f"Team A: {len(team_a_positions)} positions")
            print(f"Team B: {len(team_b_positions)} positions")
            
            bins = 50
            
            # Create custom dark colormaps
            from matplotlib.colors import LinearSegmentedColormap
            
            # Dark Red colormap (much more saturated)
            colors_red = ['#ffffff', '#ff6666', '#ff0000', '#cc0000', '#990000', '#660000']
            n_bins_red = 100
            cmap_red = LinearSegmentedColormap.from_list('dark_red', colors_red, N=n_bins_red)
            
            # Dark Blue colormap (much more saturated)
            colors_blue = ['#ffffff', '#6666ff', '#0000ff', '#0000cc', '#000099', '#000066']
            n_bins_blue = 100
            cmap_blue = LinearSegmentedColormap.from_list('dark_blue', colors_blue, N=n_bins_blue)
            
            # Create heatmap for Team A (Dark Red)
            if len(team_a_positions) > 0:
                x_a = np.array([p['x'] for p in team_a_positions])
                y_a = np.array([p['y'] for p in team_a_positions])
                heatmap_a, _, _ = np.histogram2d(x_a, y_a, bins=bins, range=[[0, 100], [0, 100]])
                heatmap_a = gaussian_filter(heatmap_a, sigma=sigma).T
                
                # Don't normalize - keep raw intensity for darker colors
                # Just scale to reasonable range
                if heatmap_a.max() > 0:
                    heatmap_a = heatmap_a / heatmap_a.max() * 2  # Boost intensity
                
                # Overlay Team A heatmap (Dark Red) with higher opacity
                extent = [0, 100, 0, 100]
                ax.imshow(heatmap_a, extent=extent, origin='lower', cmap=cmap_red,
                         alpha=0.95, interpolation='bilinear', aspect='auto', vmin=0, vmax=2)
            
            # Create heatmap for Team B (Dark Blue)
            if len(team_b_positions) > 0:
                x_b = np.array([p['x'] for p in team_b_positions])
                y_b = np.array([p['y'] for p in team_b_positions])
                heatmap_b, _, _ = np.histogram2d(x_b, y_b, bins=bins, range=[[0, 100], [0, 100]])
                heatmap_b = gaussian_filter(heatmap_b, sigma=sigma).T
                
                # Don't normalize - keep raw intensity for darker colors
                # Just scale to reasonable range
                if heatmap_b.max() > 0:
                    heatmap_b = heatmap_b / heatmap_b.max() * 2  # Boost intensity
                
                # Overlay Team B heatmap (Dark Blue) with higher opacity
                ax.imshow(heatmap_b, extent=extent, origin='lower', cmap=cmap_blue,
                         alpha=0.95, interpolation='bilinear', aspect='auto', vmin=0, vmax=2)
            
            # Add legend for both teams with darker colors
            from matplotlib.patches import Patch
            legend_elements = [
                Patch(facecolor='#cc0000', alpha=0.9, label=f'Team A ({len(team_a_positions)} pos)'),
                Patch(facecolor='#0000cc', alpha=0.9, label=f'Team B ({len(team_b_positions)} pos)')
            ]
            ax.legend(handles=legend_elements, loc='upper right', fontsize=10, 
                     framealpha=0.9, edgecolor='white')
        else:
            # Single team heatmap
            from matplotlib.colors import LinearSegmentedColormap
            
            # Create custom dark colormap based on team
            if team_filter == 'A':
                colors = ['#ffffff', '#ff6666', '#ff0000', '#cc0000', '#990000', '#660000']
            else:
                colors = ['#ffffff', '#6666ff', '#0000ff', '#0000cc', '#000099', '#000066']
            
            cmap_custom = LinearSegmentedColormap.from_list('dark_team', colors, N=100)
            
            x_coords = np.array([p['x'] for p in positions])
            y_coords = np.array([p['y'] for p in positions])
            
            # Create 2D histogram (density map)
            bins = 50
            heatmap, xedges, yedges = np.histogram2d(x_coords, y_coords, bins=bins,
                                                      range=[[0, 100], [0, 100]])
            
            # Apply Gaussian smoothing
            heatmap = gaussian_filter(heatmap, sigma=sigma)
            
            # Transpose for correct orientation
            heatmap = heatmap.T
            
            # Overlay heatmap
            extent = [0, 100, 0, 100]
            
            im = ax.imshow(heatmap, extent=extent, origin='lower', cmap=cmap_custom,
                           alpha=0.85, interpolation='bilinear', aspect='auto', vmin=0)
            
            # Add colorbar
            cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
            cbar.set_label('Activity Density', rotation=270, labelpad=20, fontsize=12)
    
    # Add title
    team_text = f"Team {team_filter}" if team_filter else "Both Teams"
    plot_type = "Player Positions" if scatter else "Player Heatmap"
    plt.title(f'{plot_type} - {team_text}\n({len(positions)} positions)',
              fontsize=16, fontweight='bold', pad=20)
    
    # Save figure
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight', facecolor='white')
    print(f"Heatmap saved to: {output_file}")
    
    plt.close()


def main():
    parser = argparse.ArgumentParser(description='Generate player heatmap from position data')
    parser.add_argument('--positions', required=True, help='Path to positions JSON file')
    parser.add_argument('--output', required=True, help='Path to output PNG file')
    parser.add_argument('--team', choices=['A', 'B'], help='Filter by team (A or B)')
    parser.add_argument('--sigma', type=float, default=3.0, help='Gaussian smoothing factor (default: 3.0)')
    parser.add_argument('--scatter', action='store_true', help='Generate scatter plot instead of heatmap')
    
    args = parser.parse_args()
    
    # Validate input file
    positions_file = Path(args.positions)
    if not positions_file.exists():
        print(f"ERROR: Positions file not found: {positions_file}", file=sys.stderr)
        sys.exit(1)
    
    # Generate heatmap
    try:
        generate_heatmap(
            positions_file=positions_file,
            output_file=args.output,
            team_filter=args.team,
            sigma=args.sigma,
            scatter=args.scatter
        )
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
