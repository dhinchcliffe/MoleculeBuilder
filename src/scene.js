import * as THREE from 'three';
import {element,chargeLabel,mass,shells,charge} from './chemistry.js';
const colors={p:0xf47772,n:0x91a7cf,e:0x8df5dd};
export class LabScene {
 constructor(container,labels){this.container=container;this.labels=labels;this.models=new Map();this.hitParticles=[];this.zoom=1;this.focusId=null;
 this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(40,1,.1,150);this.camera.position.set(0,0,23);this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);container.append(this.renderer.domElement);
 this.scene.add(new THREE.AmbientLight(0x95b9e8,2));const key=new THREE.DirectionalLight(0xffffff,3.7);key.position.set(-4,7,12);this.scene.add(key);const fill=new THREE.DirectionalLight(0x51d7bd,2);fill.position.set(8,-3,4);this.scene.add(fill);
 this.sphere=new THREE.SphereGeometry(1,20,14);this.materials=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,new THREE.MeshStandardMaterial({color:c,roughness:.26,metalness:.2,emissive:k==='e'?c:0,emissiveIntensity:.4})]));
 const dots=[];for(let x=-30;x<=30;x+=1)for(let y=-20;y<=20;y+=1)dots.push(x,y,-3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0x42617a,size:.025,transparent:true,opacity:.5})));
 this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);this.resize=new ResizeObserver(()=>this.size());this.resize.observe(container);this.size();
 }
 size(){const {width,height}=this.container.getBoundingClientRect();this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);}
 point(clientX,clientY){const r=this.container.getBoundingClientRect();const v=new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.ray.setFromCamera(v,this.camera);return this.ray.ray.intersectPlane(this.plane,new THREE.Vector3());}
 hit(x,y){this.point(x,y);const hits=this.ray.intersectObjects([...this.models.values()].filter(m=>m.group.visible).map(m=>m.group),true);return (this.focusId?hits.find(h=>h.object.userData.particle):hits.find(h=>h.object.userData.atomId))?.object.userData||null;}
 setZoom(z){this.zoom=Math.max(.45,Math.min(3,z));}
 clearModel(m){this.scene.remove(m.group);m.label.remove();for(const obj of m.group.children){if(obj.isLine){obj.geometry.dispose();obj.material.dispose();}}}
 rebuild(a){const old=this.models.get(a.id);if(old)this.clearModel(old);const group=new THREE.Group();const label=document.createElement('div');label.className='atom-label';this.labels.append(label);const electrons=[];
 const total=a.p+a.n;for(let i=0;i<total;i++){const t=(i+.5)/total;const phi=i*2.399963;const y=1-2*t;const rad=Math.sqrt(1-y*y);const shell=total<5?.15:.18+.23*Math.cbrt(t);const type=i<a.p?'p':'n';const m=new THREE.Mesh(this.sphere,this.materials[type]);m.scale.setScalar(.115);m.position.set(Math.cos(phi)*rad*shell,y*shell,Math.sin(phi)*rad*shell);m.userData={atomId:a.id,particle:type};group.add(m);}
 shells(a.e).forEach((count,s)=>{const r=1.2+s*.29;const tilt=.27+(s%2)*.4;const pts=[];for(let i=0;i<=100;i++){const ang=i/100*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(ang)*r,Math.sin(ang)*r*Math.cos(tilt),Math.sin(ang)*r*Math.sin(tilt)));}const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x75c6c5,transparent:true,opacity:.24}));group.add(ring);for(let i=0;i<count;i++){const m=new THREE.Mesh(this.sphere,this.materials.e);m.scale.setScalar(.043);m.userData={atomId:a.id,particle:'e'};group.add(m);electrons.push({m,r,tilt,phase:i/count*Math.PI*2,s});}});
 const halo=new THREE.Mesh(new THREE.RingGeometry(1.94,1.955,80),new THREE.MeshBasicMaterial({color:0x81e8cb,transparent:true,opacity:.5,side:THREE.DoubleSide}));halo.position.z=-.15;group.add(halo);
 const pick=new THREE.Mesh(new THREE.SphereGeometry(1.8,12,8),new THREE.MeshBasicMaterial({visible:false}));pick.userData={atomId:a.id};group.add(pick);
 this.scene.add(group);const model={group,label,electrons,halo,signature:`${a.p}/${a.n}/${a.e}`};this.models.set(a.id,model);return model;}
 render(atoms,selected,time){const ids=new Set(atoms.map(a=>a.id));for(const [id,m]of this.models)if(!ids.has(id)){this.clearModel(m);this.models.delete(id);}const focus=atoms.find(a=>a.id===this.focusId);const targetZ=focus?8:23/this.zoom;this.camera.position.lerp(new THREE.Vector3(focus?.x||0,focus?.y||0,targetZ),.13);this.camera.updateMatrixWorld();
 for(const a of atoms){let m=this.models.get(a.id);if(!m||m.signature!==`${a.p}/${a.n}/${a.e}`)m=this.rebuild(a);m.group.position.set(a.x,a.y,0);m.group.visible=!focus||a.id===focus.id;m.label.hidden=!m.group.visible;m.halo.visible=a.id===selected;
 for(const e of m.electrons){const angle=e.phase+time*.35/(e.s+1);e.m.position.set(Math.cos(angle)*e.r,Math.sin(angle)*e.r*Math.cos(e.tilt),Math.sin(angle)*e.r*Math.sin(e.tilt));}
 const pos=new THREE.Vector3(a.x+.62,a.y-.16,.3).project(this.camera);const r=this.container.getBoundingClientRect();m.label.style.left=`${(pos.x+1)*r.width/2}px`;m.label.style.top=`${(1-pos.y)*r.height/2}px`;m.label.innerHTML=`<strong>${element(a).symbol}</strong> · Z ${a.p}<br>A ${mass(a)} · q ${chargeLabel(a)}<br>wt ${element(a).weight}`;
 }
 this.renderer.render(this.scene,this.camera);
 }
}
