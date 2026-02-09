import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Columns, Maximize2, Minimize2 } from 'lucide-react';

export default function MultiColumnLayout({ 
  leftPanel, 
  centerPanel, 
  rightPanel,
  defaultLayout = [25, 50, 25],
  minSize = 15,
}) {
  const [collapsed, setCollapsed] = useState({ left: false, right: false });

  return (
    <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Columns className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-white">Visualização Multi-Painel</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            onClick={() => setCollapsed({ ...collapsed, left: !collapsed.left })}
          >
            {collapsed.left ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            onClick={() => setCollapsed({ ...collapsed, right: !collapsed.right })}
          >
            {collapsed.right ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
        {!collapsed.left && (
          <>
            <ResizablePanel defaultSize={defaultLayout[0]} minSize={minSize}>
              <div className="h-full overflow-auto p-4 bg-slate-900/20">
                {leftPanel}
              </div>
            </ResizablePanel>
            <ResizableHandle className="w-px bg-slate-700/50 hover:bg-orange-500/50 transition-colors" />
          </>
        )}

        <ResizablePanel 
          defaultSize={collapsed.left || collapsed.right ? 75 : defaultLayout[1]} 
          minSize={30}
        >
          <div className="h-full overflow-auto p-4">
            {centerPanel}
          </div>
        </ResizablePanel>

        {!collapsed.right && (
          <>
            <ResizableHandle className="w-px bg-slate-700/50 hover:bg-orange-500/50 transition-colors" />
            <ResizablePanel defaultSize={defaultLayout[2]} minSize={minSize}>
              <div className="h-full overflow-auto p-4 bg-slate-900/20">
                {rightPanel}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </Card>
  );
}