import {createElement,type JSX} from 'react';
import type {JsxAST,XmlAST} from 'react-native-svg';
import {sourceVersePolygons} from './mushaf-native.ts';
import openingLayout from '../data/mushaf-opening-layout.json' with {type:'json'};

function findPath(root:XmlAST,predicate:(node:XmlAST)=>boolean):XmlAST[]|null{
  if(predicate(root))return [root];
  for(const child of root.children){if(typeof child==='string')continue;const path=findPath(child,predicate);if(path)return [root,...path];}return null;
}
function xmlElement(node:XmlAST,index=0):JSX.Element {
  return createElement(node.Tag,{...node.props,key:index},node.children.map((child,i)=>typeof child==='string'?child:xmlElement(child,i)));
}
export function prepareNativeArtwork(source:string,page:number,dark:boolean,ink:string,parse:typeof import('react-native-svg').parse){
  let title:JsxAST|null=null;
  const layout=page===1?openingLayout['1']:page===2?openingLayout['2']:null;
  const polygons=sourceVersePolygons(source);
  const ast=parse(source,root=>{
    function color(node:XmlAST,marker=false,ornament=false,content=false){
      marker=marker||node.props.class==='ayah-mark';ornament=ornament||node.props.class==='ayah-mark-ornament';content=content||node.props.id==='content';
      if(node.tag==='path'){
        if(ornament)node.props.fill=page<=2?(dark?'#B56F82':'#C9516A'):'#81996A';
        else if(marker)node.props.fill=ink;
        else if(content&&dark&&node.props.fill==='#231f20')node.props.fill='#DCE0DF';
      }
      for(const child of node.children)if(typeof child!=='string')color(child,marker,ornament,content);
    }
    color(root);
    if(layout){
      const contentPath=findPath(root,node=>node.props.id==='content');const content=contentPath?.at(-1);
      const heading=content?.children[0];
      if(contentPath&&content&&heading&&typeof heading!=='string'&&heading.tag==='g'){
        let branch:XmlAST=heading;
        for(const ancestor of [...contentPath].reverse())branch={...ancestor,parent:null,children:[branch],props:{...ancestor.props}};
        title={...branch,props:{...branch.props,viewBox:layout.titleViewBox},children:branch.children.map((node,i)=>typeof node==='string'?node:xmlElement(node,i))};
        content.children.shift();
      }
      root.props.viewBox=layout.artViewBox;
    }
    root.children=root.children.filter(child=>typeof child==='string'||child.props.class!=='ayahPolygon');
    return root;
  });
  if(!ast)throw new Error('Missing Mushaf artwork');
  return {ast,title,polygons,viewBox:String(ast.props.viewBox)};
}
