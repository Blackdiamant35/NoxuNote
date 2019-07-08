import { NoxunotePlugin, NoteMetadata, Matiere, Note } from "../../../types";
import { IpcRenderer, TouchBarButton } from "electron";
import { isNull } from "util";

export type BrowseElements = {
  menu: HTMLElement,
  triggers: HTMLElement[],
  allMat: HTMLElement,
  allMatNotesCount: HTMLElement,
  matList: HTMLElement,
  filesList: HTMLElement,
  fileLookup: HTMLElement
}

export class BrowsePlugin implements NoxunotePlugin {

  public noteList: NoteMetadata[]
  public matieres: Matiere[]

  /**
   * Image de la variable loadedNote de mainWindow.js
   * mise à jour grace à la fonction setLoadedNote() présente dans mainWindow.js
   * qui appelle la méthode de cette classe.
   */
  private loadedNote: Note

  /**
   * ID de la note visible dans "Aperçu" sur laquelle on vient de cliquer dans l'arborescence
   */
  private clickedNoteId: string;
  
  constructor(public elts: BrowseElements, public ipc: IpcRenderer) {
    this.init()
    // this.elts.triggers.forEach( (e: HTMLElement) => {
    //   e.addEventListener('click', )
    // })
  }
  
  init() {
    // Mise a jour de la liste des notes
    this.noteList = this.ipc.sendSync('db_notes_getNoteList')
    // Si un note est cliquée dans l'arborescence et qu'elle éxiste encore dans la liste des notes
    // /!\ Suppose que this.noteList est à jour avec la BDD.
    if (this.clickedNoteId && this.noteList.map(nl=>nl.id).includes(this.clickedNoteId)) {
      // On met a jour l'affichage lookup sur les données de cette note
      this.renderLookup(this.clickedNoteId)
    } else {
      // Sinon on n'affiche rien
      this.clickedNoteId = null
      this.elts.fileLookup.innerHTML = ""
    }
    this.renderFiles()
    this.renderMatieres()
  }

  loadNote(id: string) {
    let note: Note = this.ipc.sendSync('db_notes_getNote', id)
    this.ipc.send('loadNote', note)
  }

  /**
   * Génère la vue des fichiers
   * @param updateNoteList Synchronise la liste des notes avec la BDD
   * @param selectedMatiereId Optionnel - Id de la matière à filtrer
   * @param orderBy Optionnel - Paramètre de tri
   */
  renderFiles(updateNoteList: boolean = false, selectedMatiereId?: string, orderBy?: string) {
    console.debug('Génération de la liste des notes (Browse)')
    if (updateNoteList) this.noteList = this.ipc.sendSync('db_notes_getNoteList')
    // clean allfiles node
    var child = this.elts.filesList.lastElementChild;  
    while (child) { 
        this.elts.filesList.removeChild(child); 
        child = this.elts.filesList.lastElementChild;  
    } 
    // create node for each filesList
    console.debug(`Génération d'un élément HTML pour la liste de notes ${JSON.stringify(this.noteList.map(n=>n.title))}`)
    this.noteList.forEach( (n: NoteMetadata) => {
      this.elts.filesList.appendChild(this.generateFileElement(n))
    })
  }

  renderLookup(noteId: string) {
    if (!this.noteList.map(nl=>nl.id).includes(noteId)) {
      console.error(`BrowsePlugin.renderLookup(${noteId}) a été call avec l'id ${noteId} qui n'éxiste plus !`)
      return
    }
    this.elts.fileLookup.innerHTML = ""
    let note: Note = this.ipc.sendSync('db_notes_getNote', noteId)
    // Table d'informations
    let rechMat: Matiere = this.matieres.find(m=>m.id==note.meta.matiere)
    //let matiereInnerHTML: string = this.generateMatiereSelector(noteId)
    let data: Array<{a:string, b:string}> = [
      {
        a: "Titre",
        b: note.meta.title
      },
      {
        a: "Dernière modif.",
        b: note.meta.lastedit
      },
      {
        a: "Favoris",
        b: note.meta.isfavorite? "Oui" : "Non"
      },
      {
        a: "Id",
        b: note.meta.id
      },
      {
        a: "Fichier",
        b: note.meta.filename
      },
      {
        a: "Matière",
        b: rechMat? rechMat.name : "(aucune)"
      }
    ]
    let table = this.generateTable(data)
    table.classList.add('fileDetailsTable')
    this.elts.fileLookup.appendChild(table)
    // Titre
    let previewTitle = document.createElement('h4')
    previewTitle.innerText = "Contenu"
    this.elts.fileLookup.appendChild(previewTitle)
    // Preview
    let preview = document.createElement('div')
    preview.innerHTML = note.content
    preview.classList.add('notePreview')
    this.elts.fileLookup.appendChild(preview)
    // Load button
    let button = document.createElement('button')
    button.classList.add("btn", "btn-secondary", "float-right", "mt-0")
    button.innerHTML = '<i class="fas fa-pen"></i> Ouvrir'
    button.addEventListener('click', ()=>this.ipc.send('loadNote', note))
    this.elts.fileLookup.appendChild(button)
    // Delete button
    let deleteButton = document.createElement('button')
    deleteButton.classList.add("btn", "btn-danger", "float-right", "mt-0")
    deleteButton.innerHTML = '<i class="fas fa-pen"></i> Supprimer'
    deleteButton.addEventListener('click', ()=>{
      if (confirm('Voulez vous vraiment supprimer cette note ?')) {
        // Si la note correspond à celle ouverte, on demande un reset de l'interface
        if (this.loadedNote && this.loadedNote.meta.id == note.meta.id) this.ipc.sendSync('forceReset')
        console.debug('Envoi commande suppression')
        this.ipc.sendSync('db_notes_deleteNote', note.meta.id)
        console.debug('réinitialisation du browser de notes')
        this.init()
      }
    })
    this.elts.fileLookup.appendChild(deleteButton)
  }

  private generateMatiereSelector(noteId: string): string {
    throw new Error("Method not implemented.");
  }

  private generateTable(data: Array<{a:string, b:string}>): HTMLTableElement {
    let table: HTMLTableElement = document.createElement('table')
    data.forEach( (data: {a:string, b:string}) => {
      let tr = document.createElement('tr')
      let tda = document.createElement('td')
      let tdb = document.createElement('td')
      tda.classList.add('tableMainColumn')
      tda.innerHTML = data.a
      tdb.innerHTML = data.b
      tr.appendChild(tda)
      tr.appendChild(tdb)
      table.appendChild(tr)
    })
    return table
  }

  private generateFileElement(meta: NoteMetadata): HTMLDivElement {
    let el = document.createElement('div')
    el.classList.add('file')
    if (this.loadedNote && this.loadedNote.meta.id == meta.id) {
      console.debug(`generateFileElement > this.loadedNote trouvé dans les notes et vaut ${JSON.stringify(this.loadedNote.meta)}`)
      el.classList.add('file-loaded')
    }
    if (this.clickedNoteId && this.clickedNoteId == meta.id) {
      el.classList.add('file-clicked')
    }
    el.appendChild(document.createTextNode(meta.title))
    let subEl = document.createElement('div')
    subEl.classList.add('lastEdit')
    subEl.innerText = meta.lastedit
    el.appendChild(subEl)
    // Handle click
    el.addEventListener('click', (event: MouseEvent) => {
      this.clickedNoteId = meta.id
      this.renderFiles(true)
      this.renderLookup(meta.id)
    })
    // Bouton ouvrir
    let button = document.createElement('button')
    button.classList.add('fileQuickLoadButton', 'btn', 'btn-sm', 'btn-secondary')
    button.setAttribute('data-tooltip', "Ouvrir")
    button.innerHTML = '<i class="fas fa-pen"></i>'
    button.addEventListener('click', ()=>this.loadNote(meta.id))
    el.appendChild(button)
    return el
  }

  renderMatieres() {
    console.debug('Génération de la liste des matières (Browse)')
    this.matieres = this.ipc.sendSync('db_matieres_getMatieres')
    // clean allfiles node
    var child = this.elts.matList.lastElementChild;  
    while (child) { 
        this.elts.matList.removeChild(child); 
        child = this.elts.matList.lastElementChild;  
    } 
    // create node for each filesList
    this.matieres.forEach( (m: Matiere) => {
      this.elts.matList.appendChild(this.generateMatiereElement(m))
    })
    // set allMatNoteCount to number of notes
    this.elts.allMatNotesCount.innerText = `(${this.noteList.length})`
  }

  private generateMatiereElement(m: Matiere): HTMLDivElement {
    let el = document.createElement('div')
    el.classList.add('matiere')
    let subEl = document.createElement('i')
    subEl.classList.add('fa', 'fa-folder-open')
    subEl.style.color = m.color
    el.appendChild(subEl)
    el.appendChild(document.createTextNode(' ' + m.name))
    // Note counter
    const noteCount: string = this.noteList.filter((n:NoteMetadata) => {
      return n.matiere? n.matiere==m.id : false
    }).length.toString()
    let noteCountElement = document.createElement('div')
    noteCountElement.classList.add('float-right')
    noteCountElement.innerText = `(${noteCount})`
    el.appendChild(noteCountElement)
    return el
  }

  /**
   * Définit dans cet objet uniquement la valeur loadedNote
   * Appelé dans la fonction setLoadedNote de **mainWindow.ts**
   * @param note nouvelle note chargée
   */
  public setLoadedNote(note: Note): void {
    console.debug(`setLoadedNote(${note})`)
    this.loadedNote = note
  }

}