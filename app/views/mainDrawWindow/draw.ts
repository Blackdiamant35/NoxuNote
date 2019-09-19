import { fabric } from "fabric"
import { enableZoom } from "./canvasZoom"
import { enableCanvasResize } from './canvasResize'
import { CanvasGrid } from "./CanvasGrid";
import { ShapeInserter } from "./ShapeInserter";
let Vue = require('../../../node_modules/vue/dist/vue.min.js')
// import { initSelectionDetails } from './components/SelectionDetails'

let app = new Vue({
  el: '#ui',
  data: {
    ShapeInserter: ShapeInserter,
    selection: {
      selectedObjs: []
    },
    ui: {
      zoomFactor: 1,
      controlBars: {
        grid: false,
        objects: true
      }
    },
    grid: {
      snapToGrid: true,
      showGrid: true,
      gridSize: 50
    }
  },
  methods: {
    gridSizeChangeEvt: (evt: any) => canvasGrid.setGridSize(evt.target.value)
  }
})

// Fabric canvas instance 
let canvas = new fabric.Canvas('canvas')

// Fabric canvas initialization
enableZoom(canvas).on('zoom', zoom => app.ui.zoomFactor = zoom) 
enableCanvasResize(canvas)
let canvasGrid = new CanvasGrid(canvas)
canvasGrid.showGridEmitter.on('change', (newValue: boolean) => app.grid.showGrid = newValue)
canvasGrid.snapToGridEmitter.on('change', (newValue: boolean) => app.grid.snapToGrid = newValue)
canvasGrid.gridSizeEmitter.on('change', (newValue: boolean) => app.grid.gridSize = newValue)
let shapeInserter = new ShapeInserter(canvas)

// Events
canvas.on('selection:created', (selection: any) => {
  app.selection.selectedObjs = canvas.getActiveObjects()
});
canvas.on('selection:updated', (selection: any) => {
  app.selection.selectedObjs = canvas.getActiveObjects()
});
canvas.on('selection:cleared', () => {
  app.selection.selectedObjs = []
});
function handlePropertyChange(evt: any, propertyName: string, object: fabric.Object) {
  let newValue: any = evt.target.value
  object.set({[propertyName]: newValue})
  console.log(evt, propertyName, object, newValue)
}

/**
 * Enables the requested 'key' control BarProp.
 * @param key grid, objects, or a bar element
 */
function enableControlBar(key: string) {
  Object.keys(app.ui.controlBars).forEach(keyItem=>app.ui.controlBars[keyItem] = keyItem==key)
}

// Tests
let rect = new fabric.Rect({
  left: 100,
  top: 100,
  fill: 'red',
  width: 20,
  height: 20
})
canvas.add(rect)